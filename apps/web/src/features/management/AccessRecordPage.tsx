"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { useAuth } from "../auth/components/AuthProvider";
import {
  assignWorkspaceRole,
  customizeWorkspaceMember,
  deleteWorkspaceRole,
  getAgencies,
  getWorkspaceRoles,
  saveWorkspaceRole,
  type PermissionOption,
  type WorkspaceMember,
  type WorkspaceRole,
} from "../auth/services/api-client";
import { useConfirmation } from "../../ui/ConfirmationModal";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import {
  EditRecordLink,
  RecordFields,
  RecordPage,
  RecordSection,
} from "../../ui/RecordPage";
import { useTranslations } from "../../i18n/LocaleProvider";
import "../../styles/roles.css";

export function AccessRecordPage({
  kind = "role",
  mode = "detail",
  id,
  initialAgencyId,
  copyId,
}: {
  kind?: "role" | "member";
  mode?: "detail" | "new" | "edit";
  id?: string;
  initialAgencyId?: string;
  copyId?: string;
}) {
  const t = useTranslations();
  const { user } = useAuth();
  const router = useRouter();
  const confirm = useConfirmation();
  const [agencyId, setAgencyId] = useState(
    initialAgencyId ?? user?.agencyId ?? "",
  );
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [member, setMember] = useState<WorkspaceMember | null>(null);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [permissions, setPermissions] = useState<PermissionOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"AGENCY" | "BRANCH">("BRANCH");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [customize, setCustomize] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const admin = user?.role === "SUPER_ADMIN" || user?.role === "AGENCY_ADMIN";
  const allowed =
    kind === "role"
      ? admin && (mode === "new" || !role?.isSystem)
      : admin &&
        member?.id !== user?.id &&
        role?.code !== "SUPER_ADMIN" &&
        (user?.role === "SUPER_ADMIN" ||
          Boolean(user?.permissions.includes("agent:update")));
  const query =
    user?.role === "SUPER_ADMIN"
      ? `?agencyId=${encodeURIComponent(agencyId)}`
      : "";
  const base =
    kind === "role" ? "/dashboard/roles" : "/dashboard/roles/members";
  const href = `${base}/${id}${query}`;
  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;
    let active = true;
    void getAgencies()
      .then((values) => {
        if (active) setAgencies(values as { id: string; name: string }[]);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load agencies",
          );
      });
    return () => {
      active = false;
    };
  }, [user?.role]);
  useEffect(() => {
    if (!agencyId) return;
    let active = true;
    void getWorkspaceRoles(user?.role === "SUPER_ADMIN" ? agencyId : undefined)
      .then((data) => {
        if (!active) return;
        setRoles(data.roles);
        setPermissions(data.permissions);
        const nextMember =
          kind === "member"
            ? data.users.find((item) => item.id === id)
            : undefined;
        const nextRole = data.roles.find(
          (item) =>
            item.id ===
            (kind === "member" ? nextMember?.roleId : (id ?? copyId)),
        );
        if (
          id &&
          ((kind === "member" && !nextMember) || (kind === "role" && !nextRole))
        )
          throw new Error("Record not found.");
        setRole(nextRole ?? null);
        setMember(nextMember ?? null);
        setSelectedRoleId(nextMember?.roleId ?? "");
        setName(
          kind === "member"
            ? `${nextMember?.firstName ?? ""} ${nextMember?.lastName ?? ""} access`
            : nextRole
              ? `${nextRole.name}${copyId ? " custom" : ""}`
              : "",
        );
        setScope(nextRole?.scope === "AGENCY" ? "AGENCY" : "BRANCH");
        setSelected(nextRole?.permissions ?? []);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load access details",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [agencyId, kind, id, copyId, user?.role]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed || loading || saving) return;
    if (
      (kind === "member" || mode === "edit") &&
      !(await confirm({
        title: "Change permissions?",
        description:
          "These changes affect access to agency records and workflows. Confirm to save the selected role and permissions.",
        confirmLabel: "Save changes",
        destructive: false,
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      if (kind === "member" && id) {
        if (customize)
          await customizeWorkspaceMember(id, {
            agencyId: user?.role === "SUPER_ADMIN" ? agencyId : undefined,
            name,
            scope,
            permissions: selected,
          });
        else
          await assignWorkspaceRole(
            id,
            selectedRoleId,
            user?.role === "SUPER_ADMIN" ? agencyId : undefined,
          );
        router.push(href);
      } else {
        const saved = await saveWorkspaceRole({
          id: mode === "edit" ? id : undefined,
          agencyId: user?.role === "SUPER_ADMIN" ? agencyId : undefined,
          name: name.trim(),
          scope,
          permissions: selected,
        });
        router.push(`/dashboard/roles/${saved.id}${query}`);
      }
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save permissions",
      );
      setSaving(false);
    }
  }
  const title =
    kind === "member"
      ? member
        ? `${member.firstName} ${member.lastName}`
        : "Team member"
      : mode === "new"
        ? "Create role"
        : (role?.name ?? "Role details");
  const groups = Object.groupBy(
    permissions.filter((permission) =>
      `${permission.code} ${permission.description}`
        .toLowerCase()
        .includes(permissionSearch.toLowerCase()),
    ),
    (permission) => permission.code.split(":")[0],
  );
  return (
    <RecordPage
      title={mode === "edit" ? `${t("Edit")} ${title}` : title}
      description={
        kind === "member"
          ? "Team member information and assigned access."
          : "Manage access to your agency's records and workflows."
      }
      eyebrow={mode === "detail" ? "Access control" : "Edit permissions"}
      summary={
        mode === "detail" && role
          ? [
              { label: "Role", value: role.name },
              { label: "Scope", value: t(role.scope) },
              { label: "Permissions", value: role.permissions.length },
            ]
          : undefined
      }
      backHref={mode === "edit" ? href : `/dashboard/roles${query}`}
      backLabel={mode === "edit" ? "Back to details" : "Back to list"}
      actions={
        mode === "detail" &&
        allowed && <EditRecordLink href={`${base}/${id}/edit${query}`} />
      }
    >
      {user?.role === "SUPER_ADMIN" && (
        <RecordSection title="Agency">
          <label className="record-form">
            <select
              aria-label={t("Agency")}
              value={agencyId}
              onChange={(event) => {
                setAgencyId(event.target.value);
                setLoading(true);
                setError("");
              }}
            >
              <option value="">{t("Select agency")}</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </label>
        </RecordSection>
      )}
      {error && (
        <div className="state-message state-error" role="alert">
          {t(error)}
        </div>
      )}
      {agencyId && loading ? (
        <div className="state-message" role="status">
          {t("Loading records...")}
        </div>
      ) : (
        agencyId &&
        !error &&
        (mode === "detail" ? (
          <>
            <RecordSection title="Overview">
              <RecordFields
                fields={
                  kind === "member" && member
                    ? [
                        { label: "Email", value: member.email },
                        {
                          label: "Branch",
                          value: member.branchName ?? t("Agency wide"),
                        },
                        {
                          label: "Status",
                          value: <Badge>{member.status}</Badge>,
                        },
                        {
                          label: "Role",
                          value: role ? (
                            <Link
                              className="text-link"
                              href={`/dashboard/roles/${role.id}${query}`}
                            >
                              {role.name}
                            </Link>
                          ) : (
                            "—"
                          ),
                        },
                      ]
                    : [
                        { label: "Role name", value: role?.name },
                        { label: "Data scope", value: role?.scope },
                        { label: "Team members", value: role?.userCount },
                        {
                          label: "Permissions",
                          value: role?.permissions.length,
                        },
                      ]
                }
              />
            </RecordSection>
            <RecordSection title="Permissions">
              <div className="record-permissions">
                {role?.permissions.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
            </RecordSection>
            {kind === "role" &&
              role?.isSystem &&
              admin &&
              role.code !== "SUPER_ADMIN" && (
                <RecordSection title="Customize role">
                  <Link
                    className="button button-secondary"
                    href={`/dashboard/roles/new?copy=${role.id}&agencyId=${encodeURIComponent(agencyId)}`}
                  >
                    {t("Customize copy")}
                  </Link>
                </RecordSection>
              )}
            {kind === "role" && allowed && role && (
              <RecordSection title="Record actions">
                <Button
                  variant="secondary"
                  disabled={role.userCount > 0 || saving}
                  onClick={async () => {
                    if (
                      !(await confirm({
                        title: "Delete role?",
                        description: `${role.name} will be permanently deleted. This action cannot be undone.`,
                        confirmLabel: "Delete role",
                      }))
                    )
                      return;
                    setSaving(true);
                    void deleteWorkspaceRole(
                      role.id,
                      user?.role === "SUPER_ADMIN" ? agencyId : undefined,
                    )
                      .then(() => router.push(`/dashboard/roles${query}`))
                      .catch((cause) => {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : "Unable to delete role",
                        );
                        setSaving(false);
                      });
                  }}
                >
                  <Trash2 size={15} />
                  {t("Delete role")}
                </Button>
                <p className="record-help">
                  {t("Reassign members before deleting a role.")}
                </p>
              </RecordSection>
            )}
          </>
        ) : !allowed ? (
          <div className="state-message">
            {t("You do not have permission to change this record.")}
          </div>
        ) : (
          <form className="record-form" onSubmit={(event) => void save(event)}>
            {kind === "member" && (
              <RecordSection title="Assigned role">
                <label>
                  {t("Role")}
                  <select
                    value={selectedRoleId}
                    required
                    onChange={(event) => {
                      setSelectedRoleId(event.target.value);
                      const next = roles.find(
                        (item) => item.id === event.target.value,
                      );
                      setSelected(next?.permissions ?? []);
                    }}
                    disabled={customize}
                  >
                    {roles
                      .filter(
                        (item) =>
                          item.code !== "SUPER_ADMIN" &&
                          (item.scope !== "BRANCH" ||
                            member?.branchId ||
                            item.id === member?.roleId),
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
                {admin && (
                  <label>
                    <span>
                      <input
                        type="checkbox"
                        checked={customize}
                        onChange={(event) => setCustomize(event.target.checked)}
                      />{" "}
                      {t("Customize permissions for this member")}
                    </span>
                  </label>
                )}
              </RecordSection>
            )}
            {(kind === "role" || customize) && (
              <>
                <RecordSection title="Role information">
                  <div className="record-form-grid">
                    <label>
                      {t("Role name")} *
                      <input
                        required
                        maxLength={80}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </label>
                    <label>
                      {t("Data scope")}
                      <select
                        value={scope}
                        onChange={(event) =>
                          setScope(event.target.value as "AGENCY" | "BRANCH")
                        }
                      >
                        <option value="AGENCY">
                          {t("All agency branches")}
                        </option>
                        <option value="BRANCH">
                          {t("Assigned branch only")}
                        </option>
                      </select>
                    </label>
                  </div>
                </RecordSection>
                <RecordSection
                  title="Permissions"
                  description="Select the actions this role can perform."
                >
                  {mode === "new" && (
                    <label className="roles-permission-template">
                      {t("Start from an existing role")}
                      <select
                        value={templateId}
                        onChange={(event) => {
                          setTemplateId(event.target.value);
                          const template = roles.find(
                            (role) => role.id === event.target.value,
                          );
                          if (template) {
                            setSelected(template.permissions);
                            setScope(
                              template.scope === "BRANCH" ? "BRANCH" : "AGENCY",
                            );
                          } else setSelected([]);
                        }}
                      >
                        <option value="">{t("Build from scratch")}</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {t(role.name)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="roles-permission-toolbar">
                    <label>
                      {t("Search permissions")}
                      <input
                        type="search"
                        value={permissionSearch}
                        onChange={(event) =>
                          setPermissionSearch(event.target.value)
                        }
                        placeholder={t("Search by action or feature")}
                      />
                    </label>
                    <span role="status">
                      {selected.length} {t("permissions selected")}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => setSelected([])}
                      disabled={!selected.length}
                    >
                      {t("Clear selection")}
                    </Button>
                  </div>
                  {!Object.keys(groups).length && (
                    <p className="record-help">
                      {t("No permissions match your search.")}
                    </p>
                  )}
                  <div className="roles-permission-groups">
                    {Object.entries(groups).map(([group, options]) => (
                      <fieldset key={group} className="roles-permission-group">
                        <legend>{t(group.replaceAll("_", " "))}</legend>
                        <div className="roles-permission-group-actions">
                          <span>
                            {options?.filter((permission) =>
                              selected.includes(permission.code),
                            ).length ?? 0}
                            /{options?.length ?? 0} {t("selected")}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelected((current) => {
                                const codes =
                                  options?.map(
                                    (permission) => permission.code,
                                  ) ?? [];
                                const all = codes.every((code) =>
                                  current.includes(code),
                                );
                                return all
                                  ? current.filter(
                                      (code) => !codes.includes(code),
                                    )
                                  : [...new Set([...current, ...codes])];
                              })
                            }
                          >
                            {t(
                              options?.every((permission) =>
                                selected.includes(permission.code),
                              )
                                ? "Clear group"
                                : "Select group",
                            )}
                          </button>
                        </div>
                        <div>
                          {options?.map((permission) => (
                            <label key={permission.code}>
                              <input
                                type="checkbox"
                                checked={selected.includes(permission.code)}
                                onChange={(event) =>
                                  setSelected((current) =>
                                    event.target.checked
                                      ? [...current, permission.code]
                                      : current.filter(
                                          (code) => code !== permission.code,
                                        ),
                                  )
                                }
                              />
                              <span>
                                <strong>
                                  {t(
                                    (
                                      {
                                        read: "View",
                                        create: "Add",
                                        update: "Edit",
                                        delete: "Deactivate",
                                      } as Record<string, string>
                                    )[permission.code.split(":")[1]] ??
                                      permission.code
                                        .split(":")[1]
                                        .replaceAll("_", " "),
                                  )}
                                </strong>
                                <small>{t(permission.description)}</small>
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </RecordSection>
              </>
            )}
            <div className="record-form-footer">
              <Link
                className="button button-secondary"
                href={mode === "new" ? `/dashboard/roles${query}` : href}
              >
                {t("Cancel")}
              </Link>
              <Button type="submit" loading={saving}>
                <Save size={15} />
                {t("Save changes")}
              </Button>
            </div>
          </form>
        ))
      )}
    </RecordPage>
  );
}
