"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, Shield, Trash2, X } from "lucide-react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { cn } from "../../lib/utils";
import { useAuth } from "../auth/components/AuthProvider";
import { deleteWorkspaceRole, getAgencies, getWorkspaceRoles, saveWorkspaceRole, type PermissionOption, type WorkspaceRole } from "../auth/services/api-client";

export function RolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [permissions, setPermissions] = useState<PermissionOption[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [agencyId, setAgencyId] = useState(user?.agencyId ?? "");
  const [editing, setEditing] = useState<WorkspaceRole | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"AGENCY" | "BRANCH">("BRANCH");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (user?.role === "SUPER_ADMIN" && !agencyId) return;
    try { const data = await getWorkspaceRoles(user?.role === "SUPER_ADMIN" ? agencyId : undefined); setRoles(data.roles); setPermissions(data.permissions); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load roles"); }
  }, [agencyId, user]);
  useEffect(() => { if (user?.role === "SUPER_ADMIN") void getAgencies().then((rows) => setAgencies(rows as { id: string; name: string }[])).catch(() => setAgencies([])); }, [user?.role]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  function start(role?: WorkspaceRole) { setEditing(role ?? null); setFormOpen(true); setName(role?.name ?? ""); setScope(role?.scope === "AGENCY" ? "AGENCY" : "BRANCH"); setSelected(role?.permissions ?? []); setError(""); }
  async function save() {
    if (!name.trim()) { setError("Enter a role name."); return; }
    setSaving(true); setError("");
    try { await saveWorkspaceRole({ id: editing?.id, agencyId: user?.role === "SUPER_ADMIN" ? agencyId : undefined, name, scope, permissions: selected }); setFormOpen(false); setEditing(null); setName(""); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save role"); }
    finally { setSaving(false); }
  }
  async function remove(role: WorkspaceRole) {
    if (!window.confirm(`Delete ${role.name}?`)) return;
    try { await deleteWorkspaceRole(role.id, user?.role === "SUPER_ADMIN" ? agencyId : undefined); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete role"); }
  }
  return <>
    <PageHeader title="Roles & permissions" description="Set agency-specific access for your team." />
    {user?.role === "SUPER_ADMIN" && <label className="mb-4 block">Agency<select className="ml-3 rounded-lg border border-slate-300 px-3 py-2" value={agencyId} onChange={(event) => setAgencyId(event.target.value)}><option value="">Select agency</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></label>}
    {error && <div className={cn("state-message state-error")} role="alert">{error}</div>}
    {formOpen ? <Card className="mb-5"><h2 className="mb-4 text-lg font-semibold">{editing ? "Edit custom role" : "Create custom role"}</h2><div className="grid gap-4 sm:grid-cols-2"><label>Role name<input className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label><label>Data scope<select className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={scope} onChange={(event) => setScope(event.target.value as "AGENCY" | "BRANCH")}><option value="BRANCH">Assigned branch only</option><option value="AGENCY">All branches in agency</option></select></label></div><fieldset className="mt-5"><legend className="mb-2 font-semibold">Permissions</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{permissions.map((permission) => <label key={permission.code} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 text-sm"><input type="checkbox" checked={selected.includes(permission.code)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, permission.code] : current.filter((code) => code !== permission.code))} /><span><strong>{permission.code}</strong><small className="block text-slate-500">{permission.description}</small></span></label>)}</div></fieldset><div className="mt-4 flex gap-2"><Button onClick={() => void save()} disabled={saving}><Check size={15} />{saving ? "Saving…" : "Save role"}</Button><Button variant="secondary" onClick={() => { setFormOpen(false); setEditing(null); }}><X size={15} />Cancel</Button></div></Card> : null}
    <Card><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">ACCESS CONTROL</p><h2>Workspace roles</h2></div><Button onClick={() => start()}><Plus size={15} />Create role</Button></div><div className="grid gap-3 md:grid-cols-2">{roles.map((role) => <article key={role.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{role.name}</h3><p className="text-sm text-slate-500">{role.isSystem ? "Built-in role" : role.scope === "BRANCH" ? "Assigned branch" : "All agency branches"} · {role.permissions.length} permissions</p></div><Shield size={18} /></div>{!role.isSystem && <div className="mt-3 flex gap-2"><Button variant="secondary" onClick={() => start(role)}><Pencil size={14} />Edit</Button><Button variant="secondary" onClick={() => void remove(role)}><Trash2 size={14} />Delete</Button></div>}</article>)}</div></Card>
  </>;
}
