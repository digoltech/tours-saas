"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, UserPlus } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/components/AuthProvider";
import {
  createAgency, createAgent, createBranch, deactivateAgency, deactivateAgent,
  deactivateBranch, getAgencies, getAgents, getBranches, updateAgency,
  updateAgent, updateBranch,
} from "../auth/services/api-client";

type Resource = "agencies" | "branches" | "agents";
type Row = Record<string, unknown> & { id: string; status: string };
type BranchOption = { id: string; name: string; code: string };
const emptyForm = { name: "", slug: "", code: "", firstName: "", lastName: "", email: "", password: "", phone: "", branchId: "", status: "ACTIVE" };
const labels: Record<Resource, { title: string; description: string }> = {
  agencies: { title: "Agencies", description: "Manage the organizations operating on the platform." },
  branches: { title: "Branches", description: "Keep each agency's operating locations accurate." },
  agents: { title: "Agents", description: "Manage people who sell and coordinate tours." },
};

export function ManagementPage({ resource }: { resource: Resource }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const config = labels[resource];
  const agencyId = user?.agencyId;
  const scopeAgencyId = agencyId ?? selectedAgencyId;
  const singular = resource === "agencies" ? "agency" : resource === "branches" ? "branch" : "agent";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = resource === "agencies" ? await getAgencies(search, statusFilter) : resource === "branches" ? await getBranches(scopeAgencyId, search, statusFilter) : await getAgents(scopeAgencyId, search, statusFilter);
      setRows(result as Row[]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load records"); }
    finally { setLoading(false); }
  }, [resource, scopeAgencyId, search, statusFilter]);

  useEffect(() => {
    if (resource !== "agencies" && !scopeAgencyId) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, resource, scopeAgencyId]);
  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN" || resource === "agencies") return;
    void getAgencies().then((data) => { const options = data as { id: string; name: string }[]; setAgencies(options); setSelectedAgencyId((current) => current || options[0]?.id || ""); }).catch(() => setAgencies([]));
  }, [resource, user?.role]);
  useEffect(() => {
    if (resource === "agents" && scopeAgencyId) void getBranches(scopeAgencyId).then((data) => setBranches(data as BranchOption[])).catch(() => setBranches([]));
  }, [resource, scopeAgencyId]);

  function startEdit(row: Row) {
    setEditing(row); setForm({ ...emptyForm, name: String(row.name ?? ""), slug: String(row.slug ?? ""), code: String(row.code ?? ""), firstName: String(row.firstName ?? ""), lastName: String(row.lastName ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? ""), branchId: String(row.branchId ?? ""), status: row.status });
    setFormOpen(true);
  }
  async function save() {
    setSaving(true); setError("");
    try {
      if (resource === "agencies") {
        if (editing) await updateAgency(editing.id, { name: form.name, slug: form.slug, email: form.email, status: form.status });
        else await createAgency({ name: form.name, slug: form.slug, email: form.email || undefined });
      }
      if (resource === "branches") {
        if (editing) await updateBranch(editing.id, { name: form.name, code: form.code, email: form.email, status: form.status });
        else await createBranch(scopeAgencyId, { name: form.name, code: form.code, email: form.email || undefined });
      }
      if (resource === "agents") {
        if (editing) await updateAgent(editing.id, { firstName: form.firstName, lastName: form.lastName, phone: form.phone, branchId: form.branchId || null, status: form.status });
        else await createAgent(scopeAgencyId, form);
      }
      setForm(emptyForm); setFormOpen(false); setEditing(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save record"); }
    finally { setSaving(false); }
  }
  async function deactivate(id: string) {
    try { if (resource === "agencies") await deactivateAgency(id); if (resource === "branches") await deactivateBranch(id); if (resource === "agents") await deactivateAgent(id); setSelected(null); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update record"); }
  }

  const can = (action: string) => user?.role === "SUPER_ADMIN" || user?.permissions.includes(`${singular}:${action}`);
  return <>
    <PageHeader title={config.title} description={config.description} action={can("create") ? <Button onClick={() => { setEditing(null); setForm(emptyForm); setFormOpen((open) => !open); }}><Plus size={16} /> Add {singular}</Button> : undefined} />
    {formOpen && <Card className="management-form"><div className="card-heading"><div><p className="eyebrow">{editing ? "Update record" : "New record"}</p><h2>{editing ? "Edit" : "Add"} {singular}</h2></div></div>
      <div className="form-grid">
        {resource === "agents" ? <><label>First name<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label><label>Last name<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></label><label>Email<input type="email" value={form.email} disabled={!!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>{!editing && <label>Temporary password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to send an invitation" /></label>}<label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Branch<select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}><option value="">Unassigned</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label></> : <><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>{resource === "agencies" ? "Slug" : "Code"}<input value={resource === "agencies" ? form.slug : form.code} onChange={(e) => setForm({ ...form, ...(resource === "agencies" ? { slug: e.target.value } : { code: e.target.value }) })} required /></label><label>Contact email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label></>}
        {editing && <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>ACTIVE</option><option>INACTIVE</option></select></label>}
      </div><div className="management-toolbar"><Button onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Save record"}</Button><Button variant="secondary" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button></div></Card>}
    {error && <div className="state-message state-error" role="alert"><strong>{error}</strong></div>}
    {selected && <Card className="management-form"><div className="card-heading"><div><p className="eyebrow">Record details</p><h2>{String(selected.name ?? `${selected.firstName ?? ""} ${selected.lastName ?? ""}`)}</h2></div><Badge>{selected.status}</Badge></div><p>{String(selected.email ?? selected.phone ?? "No contact details")}</p><Button variant="secondary" onClick={() => startEdit(selected)} disabled={!can("update")}><Pencil size={15} /> Edit</Button><Button variant="secondary" onClick={() => setSelected(null)}>Close</Button></Card>}
    <Card className="management-card"><div className="management-toolbar"><label className="search-field"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${resource}`} /></label><label>Status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>{user?.role === "SUPER_ADMIN" && resource !== "agencies" && <label>Agency<select value={selectedAgencyId} onChange={(e) => setSelectedAgencyId(e.target.value)}><option value="">Select agency</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></label>}<Badge>{rows.length} records</Badge></div>
      {loading ? <div className="state-message">Loading records...</div> : rows.length === 0 ? <div className="state-message"><UserPlus size={18} /><strong>No {resource} found</strong><span>Add a record or adjust the search.</span></div> : <div className="table-wrapper"><table><thead><tr><th>Name</th><th>Code / email</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><button className="text-link" onClick={() => setSelected(row)}><strong>{String(row.name ?? `${row.firstName ?? ""} ${row.lastName ?? ""}`)}</strong></button></td><td>{String(row.slug ?? row.code ?? row.email ?? "-")}</td><td><Badge>{row.status}</Badge></td><td className="table-actions"><button className="button button-ghost" onClick={() => startEdit(row)} disabled={!can("update")} aria-label={`Edit ${singular}`}><Pencil size={15} /></button><button className="button button-ghost" disabled={row.status === "INACTIVE" || !can("delete")} onClick={() => void deactivate(row.id)}>Deactivate</button></td></tr>)}</tbody></table></div>}
    </Card>
  </>;
}
