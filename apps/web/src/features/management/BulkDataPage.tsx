"use client";

import { useEffect, useState } from "react";
import { Download, FileUp, RefreshCw } from "lucide-react";
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
  const { user } = useAuth();
  const [entity, setEntity] = useState<BulkEntity>("buses");
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<{ results: { row: number; ok: boolean; message: string }[]; valid: number; invalid: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user?.role === "SUPER_ADMIN") void getAgencies().then((rows) => { const values = rows as { id: string; name: string }[]; setAgencies(values); setAgencyId(values[0]?.id ?? ""); }).catch(() => setAgencies([])); }, [user?.role]);
  const allowed = (action: "read" | "create") => user?.role === "SUPER_ADMIN" || user?.permissions.includes(`${entities.find((item) => item.key === entity)?.permission}:${action}`);
  async function getFile(kind: "template" | "export") {
    setBusy(true); setError("");
    try { download(`${entity}-${kind}.csv`, await fetchBulkCsv(entity, kind, agencyId || undefined)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to download CSV"); }
    finally { setBusy(false); }
  }
  async function preview() {
    setBusy(true); setError("");
    try { setResult(await previewBulkImport(entity, rows, agencyId || undefined)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to validate CSV"); }
    finally { setBusy(false); }
  }
  async function commit() {
    setBusy(true); setError("");
    try { const committed = await commitBulkImport(entity, rows, agencyId || undefined); setResult(committed); const failures = committed.results.filter((item) => !item.ok); if (failures.length) download(`${entity}-import-errors.csv`, `row,error\r\n${failures.map((item) => `${item.row},"${item.message.replaceAll('"', '""')}"`).join("\r\n")}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to import CSV"); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeader title="Bulk data" description="Import or export fleet and route records with CSV files." />
    {error && <div className={cn("state-message state-error")} role="alert">{error}</div>}
    <Card className="mb-4"><div className="grid gap-4 sm:grid-cols-2">{user?.role === "SUPER_ADMIN" && <label>Agency<select value={agencyId} onChange={(event) => setAgencyId(event.target.value)}><option value="">Select agency</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></label>}<label>Record type<select value={entity} onChange={(event) => { setEntity(event.target.value as BulkEntity); setRows([]); setResult(null); }}><option value="buses">Buses</option><option value="drivers">Drivers</option><option value="routes">Routes</option><option value="stops">Stops</option></select></label><div className="flex flex-wrap items-end gap-2">{(allowed("read") || allowed("create")) && <Button variant="secondary" onClick={() => void getFile("template")} disabled={busy}><Download size={15} />CSV template</Button>}{allowed("read") && <Button variant="secondary" onClick={() => void getFile("export")} disabled={busy}><Download size={15} />Export records</Button>}</div></div></Card>
    {allowed("create") && <Card><p className="eyebrow">IMPORT</p><h2 className="mb-3 text-lg font-semibold">Upload CSV and review rows</h2><input type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; setRows([]); setResult(null); setError(""); if (!file) return; try { setRows(parseCsv(await file.text())); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to parse CSV"); } }} /><p className="mt-2 text-sm text-slate-500">Up to 500 rows. Use the template’s exact column names. Valid rows can be imported even when other rows fail validation.</p>{rows.length > 0 && <><p className="mt-3">{rows.length} rows loaded.</p><div className="mt-3 flex gap-2"><Button onClick={() => void preview()} disabled={busy}><RefreshCw size={15} />{busy ? "Checking…" : "Validate rows"}</Button>{result && result.valid > 0 && <Button onClick={() => void commit()} disabled={busy}><FileUp size={15} />{busy ? "Importing…" : `Import ${result.valid} valid rows`}</Button>}</div></>}</Card>}
    {result && <Card className="mt-4"><h2 className="mb-2 font-semibold">{result.valid} valid · {result.invalid} need attention</h2><div className="max-h-[32rem] overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">CSV row</th><th className="p-2">Result</th><th className="p-2">Details</th></tr></thead><tbody>{result.results.map((item) => <tr key={item.row} className="border-t"><td className="p-2">{item.row}</td><td className="p-2">{item.ok ? "Valid" : "Error"}</td><td className="p-2">{item.message}</td></tr>)}</tbody></table></div></Card>}
  </>;
}
