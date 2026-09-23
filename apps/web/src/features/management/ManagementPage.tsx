"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import {
  createAgency,
  createAgent,
  createBranch,
  deactivateAgency,
  deactivateAgent,
  deactivateBranch,
  getAgencies,
  getBranches,
  getAgents,
} from "../auth/services/api-client";
import { useAuth } from "../auth/components/AuthProvider";

type Resource = "agencies" | "branches" | "agents";
type Row = Record<string, unknown> & { id: string; status: string };

const labels: Record<Resource, { title: string; description: string }> = {
  agencies: { title: "Agencies", description: "Manage the organizations operating on the platform." },
  branches: { title: "Branches", description: "Keep each agency's operating locations accurate." },
  agents: { title: "Agents", description: "Manage people who sell and coordinate tours." },
};

export function ManagementPage({ resource }: { resource: Resource }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", code: "", firstName: "", lastName: "", email: "", password: "" });
  const config = labels[resource];
  const agencyId = user?.agencyId;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = resource === "agencies"
        ? await getAgencies(search)
        : resource === "branches"
          ? await getBranches(agencyId ?? "", search)
          : await getAgents(agencyId ?? "", search);
      setRows(result as Row[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load records");
    } finally {
      setLoading(false);
    }
  }, [agencyId, resource, search]);

  useEffect(() => {
    if (resource !== "agencies" && !agencyId) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [agencyId, load, resource]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      if (resource === "agencies") await createAgency({ name: form.name, slug: form.slug });
      if (resource === "branches") await createBranch(agencyId ?? "", { name: form.name, code: form.code });
      if (resource === "agents") await createAgent(agencyId ?? "", form);
      setForm({ name: "", slug: "", code: "", firstName: "", lastName: "", email: "", password: "" });
      setFormOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save record");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    try {
      if (resource === "agencies") await deactivateAgency(id);
      if (resource === "branches") await deactivateBranch(id);
      if (resource === "agents") await deactivateAgent(id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update record");
    }
  }

  const canCreate = user?.role === "SUPER_ADMIN" || user?.permissions.includes(`${resource === "agencies" ? "agency" : resource.slice(0, -1)}:create`);
  return (
    <>
      <PageHeader title={config.title} description={config.description} action={canCreate ? <Button onClick={() => setFormOpen((open) => !open)}><Plus size={16} /> Add {resource.slice(0, -1)}</Button> : undefined} />
      {formOpen && (
        <Card className="management-form">
          <div className="card-heading"><div><p className="eyebrow">New record</p><h2>Add {resource.slice(0, -1)}</h2></div></div>
          <div className="form-grid">
            {resource === "agents" ? <><label>First name<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label><label>Last name<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label><label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Optional" /></label></> : <><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>{resource === "agencies" ? "Slug" : "Code"}<input value={resource === "agencies" ? form.slug : form.code} onChange={(event) => setForm({ ...form, ...(resource === "agencies" ? { slug: event.target.value } : { code: event.target.value }) })} /></label></>}
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save record"}</Button>
        </Card>
      )}
      {error && <div className="state-message state-error"><strong>{error}</strong></div>}
      <Card className="management-card">
        <div className="management-toolbar"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${resource}`} /></label><Badge>{rows.length} records</Badge></div>
        {loading ? <div className="state-message">Loading records...</div> : rows.length === 0 ? <div className="state-message"><UserPlus size={18} /><strong>No {resource} found</strong><span>Add a record or adjust the search.</span></div> : <div className="table-wrapper"><table><thead><tr><th>Name</th><th>Contact</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{String(row.name ?? `${row.firstName ?? ""} ${row.lastName ?? ""}`)}</strong><small>{String(row.slug ?? row.code ?? "")}</small></td><td>{String(row.email ?? "-")}</td><td><Badge>{row.status}</Badge></td><td><button className="button button-ghost" disabled={row.status === "INACTIVE"} onClick={() => void deactivate(row.id)}>Deactivate</button></td></tr>)}</tbody></table></div>}
      </Card>
    </>
  );
}
