"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Pencil, Plus, Search, Shield, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/components/AuthProvider";
import { assignWorkspaceRole, customizeWorkspaceMember, deleteWorkspaceRole, getAgencies, getWorkspaceRoles, saveWorkspaceRole, type PermissionOption, type WorkspaceMember, type WorkspaceRole } from "../auth/services/api-client";

export function RolesPage() {
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === "SUPER_ADMIN";
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [permissions, setPermissions] = useState<PermissionOption[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [agencyId, setAgencyId] = useState(user?.agencyId ?? "");
  const [editing, setEditing] = useState<WorkspaceRole | null>(null);
  const [customizingMember, setCustomizingMember] = useState<WorkspaceMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"AGENCY" | "BRANCH">("BRANCH");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({});
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user || (isPlatformAdmin && !agencyId)) {
      setRoles([]); setMembers([]); setPermissions([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getWorkspaceRoles(isPlatformAdmin ? agencyId : undefined);
      setRoles(data.roles);
      setMembers(data.users);
      setPermissions(data.permissions);
      setDraftRoles({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load roles and team members.");
    } finally { setLoading(false); }
  }, [agencyId, isPlatformAdmin, user]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    let active = true;
    getAgencies().then((rows) => { if (active) setAgencies(rows as { id: string; name: string }[]); })
      .catch(() => { if (active) setError("Unable to load agencies."); });
    return () => { active = false; };
  }, [isPlatformAdmin]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function start(role?: WorkspaceRole, duplicate = false) {
    setCustomizingMember(null);
    setEditing(role && !duplicate && !role.isSystem ? role : null);
    setFormOpen(true);
    setName(role ? duplicate ? `${role.name} custom` : role.name : "");
    setScope(role?.scope === "AGENCY" || role?.scope === "PLATFORM" ? "AGENCY" : "BRANCH");
    setSelected(role?.permissions ?? []);
    setError(""); setMessage("");
    window.requestAnimationFrame(() => document.getElementById("role-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function startForMember(member: WorkspaceMember) {
    const role = roles.find((candidate) => candidate.id === member.roleId);
    setEditing(null);
    setCustomizingMember(member);
    setFormOpen(true);
    setName(`${member.firstName} ${member.lastName} access`);
    setScope(role?.scope === "BRANCH" && member.branchId ? "BRANCH" : "AGENCY");
    setSelected(role?.permissions ?? []);
    setError(""); setMessage("");
    window.requestAnimationFrame(() => document.getElementById("role-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  async function save() {
    if (!name.trim()) { setError("Enter a role name."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const input = { agencyId: isPlatformAdmin ? agencyId : undefined, name: name.trim(), scope, permissions: selected };
      if (customizingMember) await customizeWorkspaceMember(customizingMember.id, input);
      else await saveWorkspaceRole({ ...input, id: editing?.id });
      setFormOpen(false); setEditing(null); setCustomizingMember(null);
      await load();
      setMessage(customizingMember ? `Custom permissions saved for ${customizingMember.firstName}.` : editing ? "Role permissions updated. Assigned members now use these permissions." : "Custom role created. You can assign it to a team member below.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save role."); }
    finally { setSaving(false); }
  }
  async function remove(role: WorkspaceRole) {
    if (!window.confirm(`Delete ${role.name}?`)) return;
    setError(""); setMessage("");
    try {
      await deleteWorkspaceRole(role.id, isPlatformAdmin ? agencyId : undefined);
      await load();
      setMessage("Role deleted.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete role."); }
  }
  async function assign(member: WorkspaceMember) {
    const roleId = draftRoles[member.id];
    if (!roleId || roleId === member.roleId) return;
    setSavingMemberId(member.id); setError(""); setMessage("");
    try {
      await assignWorkspaceRole(member.id, roleId, isPlatformAdmin ? agencyId : undefined);
      await load();
      setMessage(`${member.firstName} ${member.lastName}'s role was updated.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update team member."); }
    finally { setSavingMemberId(null); }
  }
  const visibleMembers = members.filter((member) => `${member.firstName} ${member.lastName} ${member.email} ${member.branchName ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const permissionGroups = Object.groupBy(permissions, (permission) => permission.code.split(":")[0]);

  return <>
    <PageHeader title="Roles & permissions" description="Manage team access across your agency." />
    {isPlatformAdmin && <label className="roles-agency-picker">Agency <select value={agencyId} onChange={(event) => { setAgencyId(event.target.value); setFormOpen(false); setSearch(""); }}><option value="">Select agency</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></label>}
    {error && <div className="state-message state-error" role="alert">{error}</div>}
    {message && <div className="roles-success" role="status"><Check size={17} />{message}</div>}
    {isPlatformAdmin && !agencyId ? <Card className="roles-prompt">Select an agency to manage its team and roles.</Card> : <>
      <div className="roles-overview">
        <Card><span className="roles-overview-icon"><Users size={20} /></span><div><strong>{members.length}</strong><span>Team members</span></div></Card>
        <Card><span className="roles-overview-icon"><Shield size={20} /></span><div><strong>{roles.length}</strong><span>Available roles</span></div></Card>
        <Card><span className="roles-overview-icon"><ShieldCheck size={20} /></span><div><strong>{roles.filter((role) => !role.isSystem).length}</strong><span>Custom roles</span></div></Card>
      </div>
      <Card className="roles-section">
        <div className="roles-section-heading"><div><p className="eyebrow">ACCESS CONTROL</p><h2>Workspace roles</h2><p>Choose a role to review its permissions. Custom roles can be edited for this agency.</p></div><Button onClick={() => start()}><Plus size={16} /> Create role</Button></div>
        {loading ? <p className="roles-state">Loading roles…</p> : <div className="roles-grid">{roles.map((role) => <article key={role.id} className="roles-card">
          <div className="roles-card-top"><span className="roles-card-icon"><Shield size={20} /></span><span className="roles-scope">{role.scope.toLowerCase()}</span></div>
          <h3>{role.name}</h3><p>{role.isSystem ? "Built-in role" : "Custom agency role"} · {role.permissions.length} permissions · {role.userCount} {role.userCount === 1 ? "member" : "members"}</p>
          <div className="roles-card-permissions">{role.permissions.slice(0, 3).map((code) => <span key={code}>{code}</span>)}{role.permissions.length > 3 && <span>+{role.permissions.length - 3} more</span>}</div>
          <div className="roles-card-actions">{role.code === "SUPER_ADMIN" ? <span className="roles-platform-note">Platform role · managed centrally</span> : role.isSystem ? <Button variant="secondary" onClick={() => start(role, true)}><Copy size={15} /> Customize copy</Button> : <><Button variant="secondary" onClick={() => start(role)}><Pencil size={15} /> Edit permissions</Button><Button variant="ghost" disabled={role.userCount > 0} onClick={() => void remove(role)} aria-label={`Delete ${role.name}`} title={role.userCount > 0 ? "Reassign members before deleting" : "Delete role"}><Trash2 size={16} /></Button></>}</div>
        </article>)}</div>}
      </Card>
      {formOpen && <Card className="roles-editor" id="role-editor"><div className="roles-section-heading"><div><p className="eyebrow">ROLE EDITOR</p><h2>{customizingMember ? `Permissions for ${customizingMember.firstName} ${customizingMember.lastName}` : editing ? `Edit ${editing.name}` : "Create custom role"}</h2><p>{customizingMember ? "This creates a dedicated role and assigns it to this member." : "Changes to an existing role affect every member assigned to it."}</p></div><button className="roles-icon-button" type="button" aria-label="Close role editor" onClick={() => setFormOpen(false)}><X size={19} /></button></div>
        <div className="roles-editor-fields"><label>Role name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="e.g. Booking manager" /></label><label>Data scope<select value={scope} onChange={(event) => setScope(event.target.value as "AGENCY" | "BRANCH")}><option value="AGENCY">All agency branches</option><option value="BRANCH">Assigned branch only</option></select></label></div>
        <fieldset className="roles-permission-fieldset"><legend>Permissions <span>{selected.length} selected</span></legend><div className="roles-permission-groups">{Object.entries(permissionGroups).map(([group, options]) => <div key={group} className="roles-permission-group"><h3>{group.replaceAll("_", " ")}</h3><div>{options?.map((permission) => <label key={permission.code}><input type="checkbox" checked={selected.includes(permission.code)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, permission.code] : current.filter((code) => code !== permission.code))} /><span><strong>{permission.code.split(":")[1]}</strong><small>{permission.description}</small></span></label>)}</div></div>)}</div></fieldset>
        <div className="roles-editor-actions"><Button disabled={saving} onClick={() => void save()}><Check size={16} />{saving ? "Saving…" : customizingMember ? "Save member permissions" : editing ? "Save permissions" : "Create role"}</Button><Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button></div>
      </Card>}
      <Card className="roles-section"><div className="roles-section-heading"><div><p className="eyebrow">TEAM ACCESS</p><h2>All team members</h2><p>Assign a role to change a member’s permissions.</p></div><label className="roles-search"><Search size={17} /><span className="sr-only">Search team members</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search team members" /></label></div>
        {loading ? <p className="roles-state">Loading team members…</p> : visibleMembers.length ? <div className="roles-table-wrap"><table className="roles-table"><thead><tr><th>Team member</th><th>Branch</th><th>Status</th><th>Role</th><th>Action</th></tr></thead><tbody>{visibleMembers.map((member) => {
          const currentRole = roles.find((role) => role.id === member.roleId);
          const draft = draftRoles[member.id] ?? member.roleId;
          const isSelf = member.id === user?.id;
          return <tr key={member.id}><td><div className="roles-member"><span className="roles-avatar">{member.firstName[0]}{member.lastName[0]}</span><span><strong>{member.firstName} {member.lastName}{isSelf ? " (you)" : ""}</strong><small>{member.email}</small></span></div></td><td>{member.branchName ?? "Agency wide"}</td><td><span className={`roles-status roles-status-${member.status.toLowerCase()}`}>{member.status.toLowerCase()}</span></td><td><select aria-label={`Role for ${member.firstName} ${member.lastName}`} value={draft} disabled={isSelf || Boolean(savingMemberId)} onChange={(event) => setDraftRoles((current) => ({ ...current, [member.id]: event.target.value }))}>{roles.filter((role) => role.code !== "SUPER_ADMIN" && (role.scope !== "BRANCH" || member.branchId || role.id === member.roleId)).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}{!currentRole && <option value={member.roleId}>Current role</option>}</select></td><td><div className="roles-member-actions"><Button variant="secondary" disabled={isSelf || !draft || draft === member.roleId || Boolean(savingMemberId)} onClick={() => void assign(member)}>{savingMemberId === member.id ? "Saving…" : "Save"}</Button><Button variant="ghost" disabled={isSelf || currentRole?.code === "SUPER_ADMIN"} onClick={() => startForMember(member)}><Pencil size={14} /> Permissions</Button></div></td></tr>;
        })}</tbody></table></div> : <p className="roles-state">{members.length ? "No team members match your search." : "No team members found in this agency."}</p>}
      </Card>
    </>}
  </>;
}
