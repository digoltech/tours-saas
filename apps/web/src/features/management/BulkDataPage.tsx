"use client";
import { LocalizedValue } from "../../i18n/LocalizedValue";
import { localizeText } from "../../i18n/errors";
import { Translate } from "../../i18n/Translate";
import { useTranslations } from "../../i18n/LocaleProvider";

import "../../styles/privacy.css";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, FileUp, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { cn } from "../../lib/utils";
import { useAuth } from "../auth/components/AuthProvider";
import { commitBulkImport, fetchBulkCsv, getAgencies, previewBulkImport, type BulkEntity } from "../auth/services/api-client";

const entities: { key: BulkEntity; label: string; permission: string }[] = [
  { key: "buses", label: "Buses", permission: "bus" },
  { key: "drivers", label: "Drivers", permission: "driver" },
  { key: "routes", label: "Routes", permission: "route" },
  { key: "stops", label: "Stops", permission: "stop" },
];
function parseCsv(source: string) {
  const lines: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && source[i + 1] === "\n") i += 1; row.push(cell); if (row.some((value) => value.trim())) lines.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell); if (row.some((value) => value.trim())) lines.push(row);
  if (quoted) throw new Error("CSV has an unclosed quoted field");
  if (lines.length < 2) throw new Error("CSV must include a header and at least one data row");
  const headers = lines[0].map((value) => value.trim());
  return lines.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])));
}
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

export function BulkDataPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const [entity, setEntity] = useState<BulkEntity>("buses");
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<{ results: { row: number; ok: boolean; message: string }[]; valid: number; invalid: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"template" | "export" | "preview" | "commit" | null>(null);
  const [fileName, setFileName] = useState("");
  useEffect(() => { if (user?.role === "SUPER_ADMIN") void getAgencies().then((rows) => { const values = rows as { id: string; name: string }[]; setAgencies(values); setAgencyId(values[0]?.id ?? ""); }).catch(() => setAgencies([])); }, [user?.role]);
  const allowed = (action: "read" | "create") => user?.role === "SUPER_ADMIN" || user?.permissions.includes(`${entities.find((item) => item.key === entity)?.permission}:${action}`);
  async function getFile(kind: "template" | "export") {
    setBusy(kind); setError("");
    try { download(`${entity}-${kind}.csv`, await fetchBulkCsv(entity, kind, agencyId || undefined)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : localizeText("Unable to download CSV")); }
    finally { setBusy(null); }
  }
  async function preview() {
    setBusy("preview"); setError("");
    try { setResult(await previewBulkImport(entity, rows, agencyId || undefined)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : localizeText("Unable to validate CSV")); }
    finally { setBusy(null); }
  }
  async function commit() {
    setBusy("commit"); setError("");
    try { const committed = await commitBulkImport(entity, rows, agencyId || undefined); setResult(committed); setRows([]); setFileName(""); const failures = committed.results.filter((item) => !item.ok); if (failures.length) download(`${entity}-import-errors.csv`, `row,error\r\n${failures.map((item) => `${item.row},"${item.message.replaceAll('"', '""')}"`).join("\r\n")}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : localizeText("Unable to import CSV")); }
    finally { setBusy(null); }
  }
  return <>
    <PageHeader title="Bulk data" description="Import or export fleet and route records with CSV files." />
    <div className="data-hero"><span className="data-hero-icon"><FileSpreadsheet size={25} /></span><div><p className="eyebrow"><Translate text={"DATA WORKSPACE"} /></p><h1><Translate text={"Move records with confidence"} /></h1><p><Translate text={"Download a template, validate your file, then import the rows that are ready."} /></p></div></div>
    {error && <div className={cn("state-message state-error")} role="alert">{error}</div>}
    <Card className="data-card"><div className="data-card-heading"><div><p className="eyebrow"><Translate text={"STEP 01"} /></p><h2><Translate text={"Choose records"} /></h2><p><Translate text={"Select the data you want to work with."} /></p></div></div><div className="data-controls">{user?.role === "SUPER_ADMIN" && <label><Translate text={"Agency"} /><select value={agencyId} disabled={busy !== null} onChange={(event) => { setAgencyId(event.target.value); setRows([]); setResult(null); setFileName(""); }}><option value=""><Translate text={"Select agency"} /></option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></label>}<label><Translate text={"Record type"} /><select value={entity} disabled={busy !== null} onChange={(event) => { setEntity(event.target.value as BulkEntity); setRows([]); setResult(null); setFileName(""); }}>{entities.map((item) => <option key={item.key} value={item.key}>{t(item.label)}</option>)}</select></label></div><div className="data-card-actions">{(allowed("read") || allowed("create")) && <Button variant="secondary" onClick={() => void getFile("template")} disabled={busy !== null} loading={busy === "template"} loadingLabel="Downloading…"><Download size={16} /> <Translate text={"CSV template"} /></Button>}{allowed("read") && <Button variant="secondary" onClick={() => void getFile("export")} disabled={busy !== null || (user?.role === "SUPER_ADMIN" && !agencyId)} loading={busy === "export"} loadingLabel="Exporting…"><Download size={16} /> <Translate text={"Export records"} /></Button>}</div></Card>
    {allowed("create") && <Card className="data-card"><div className="data-card-heading"><div><p className="eyebrow"><Translate text={"STEP 02"} /></p><h2><Translate text={"Upload and validate"} /></h2><p><Translate text={"Use the template’s exact column names. Files can contain up to 500 rows."} /></p></div></div><label className="data-upload"><UploadCloud size={26} /><strong>{fileName || "Choose a CSV file"}</strong><span><LocalizedValue value={fileName ? `${rows.length} rows ready for validation` : "Browse your device to select a .csv file"} /></span><input type="file" accept=".csv,text/csv" disabled={busy !== null} onChange={async (event) => { const file = event.target.files?.[0]; setRows([]); setResult(null); setError(""); setFileName(file?.name ?? ""); if (!file) return; try { const parsed = parseCsv(await file.text()); if (parsed.length > 500) throw new Error("CSV files can contain up to 500 data rows."); setRows(parsed); } catch (cause) { setFileName(""); setError(cause instanceof Error ? cause.message : localizeText("Unable to parse CSV")); } }} /></label>{rows.length > 0 && <div className="data-card-actions"><span className="data-ready"><CheckCircle2 size={17} /> {rows.length} <Translate text={"rows loaded"} /></span><Button onClick={() => void preview()} disabled={busy !== null || (user?.role === "SUPER_ADMIN" && !agencyId)} loading={busy === "preview"} loadingLabel="Validating…"><RefreshCw size={16} /> <Translate text={"Validate rows"} /></Button>{result && result.valid > 0 && <Button onClick={() => void commit()} disabled={busy !== null} loading={busy === "commit"} loadingLabel="Importing…"><FileUp size={16} /> <Translate text={"Import"} />{" "}{result.valid} <Translate text={"valid rows"} /></Button>}</div>}</Card>}
    {result && <Card className="data-card"><div className="data-card-heading"><div><p className="eyebrow"><Translate text={"VALIDATION RESULTS"} /></p><h2>{result.valid} <Translate text={"valid ·"} />{" "}{result.invalid} <Translate text={"need attention"} /></h2><p><Translate text={"Review each CSV row before importing. Failed rows can be corrected in your file."} /></p></div></div><div className="table-wrapper data-results"><table><thead><tr><th><Translate text={"CSV row"} /></th><th><Translate text={"Result"} /></th><th><Translate text={"Details"} /></th></tr></thead><tbody>{result.results.map((item) => <tr key={item.row}><td>{item.row}</td><td><span className={item.ok ? "data-status-good" : "data-status-error"}><LocalizedValue value={item.ok ? "Valid" : "Error"} /></span></td><td>{item.message}</td></tr>)}</tbody></table></div></Card>}
  </>;
}
