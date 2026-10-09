"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Ban, Save } from "lucide-react";
import { useAuth } from "../auth/components/AuthProvider";
import * as api from "../auth/services/api-client";
import {
  useConfirmation,
  confirmStatusChange,
} from "../../ui/ConfirmationModal";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import {
  EditRecordLink,
  RecordFields,
  RecordPage,
  RecordSection,
} from "../../ui/RecordPage";
import { useFormattingLocale } from "../../i18n/format-client";
import { useTranslations } from "../../i18n/LocaleProvider";
import { DataTable } from "../../ui/DataTable";
import {
  isAgencyOwner,
  canManageTeam,
  standardRoleNames,
  standardRoleDescriptions,
} from "@a-one-tours/shared/team-access";

export type EntityResource =
  "agencies" | "branches" | "agents" | "drivers" | "routes" | "buses" | "stops";
type RecordData = api.ManagementRecord;
type Field = {
  key: string;
  label: string;
  required?: boolean;
  type?: "email" | "tel" | "date" | "number" | "password" | "textarea";
  minLength?: number;
  help?: string;
};
const contactFields: Field[] = [
  { key: "phone", label: "Phone", type: "tel" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
];
const configurations: Record<
  EntityResource,
  { singular: string; permission: string; fields: Field[] }
> = {
  agencies: {
    singular: "Agency",
    permission: "agency",
    fields: [
      { key: "name", label: "Agency name", required: true, minLength: 2 },
      { key: "slug", label: "Slug", required: true, minLength: 2 },
      { key: "email", label: "Contact email", type: "email" },
      ...contactFields,
    ],
  },
  branches: {
    singular: "Branch",
    permission: "branch",
    fields: [
      { key: "name", label: "Branch name", required: true, minLength: 2 },
      { key: "code", label: "Code", required: true, minLength: 2 },
      { key: "email", label: "Contact email", type: "email" },
      ...contactFields,
    ],
  },
  agents: {
    singular: "Team member",
    permission: "agent",
    fields: [
      { key: "firstName", label: "First name", required: true },
      { key: "lastName", label: "Last name", required: true },
      { key: "email", label: "Email", required: true, type: "email" },
      { key: "phone", label: "Phone", type: "tel", required: true },
      {
        key: "password",
        label: "Temporary password",
        type: "password",
        minLength: 8,
        help: "Leave blank to send an invitation.",
      },
    ],
  },
  drivers: {
    singular: "Driver",
    permission: "driver",
    fields: [
      { key: "firstName", label: "First name", required: true },
      { key: "lastName", label: "Last name", required: true },
      {
        key: "phone",
        label: "Phone",
        required: true,
        type: "tel",
        minLength: 5,
      },
      { key: "email", label: "Email", type: "email" },
      {
        key: "licenseNumber",
        label: "License number",
        required: true,
        minLength: 2,
      },
      { key: "licenseExpiryDate", label: "License expiry", type: "date" },
    ],
  },
  routes: {
    singular: "Route",
    permission: "route",
    fields: [
      { key: "name", label: "Route name", required: true, minLength: 2 },
      { key: "code", label: "Code", required: true },
      { key: "source", label: "Source", required: true },
      { key: "destination", label: "Destination", required: true },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  buses: {
    singular: "Bus",
    permission: "bus",
    fields: [
      { key: "busNumber", label: "Bus number" },
      { key: "registrationNumber", label: "Registration number" },
      { key: "operatorName", label: "Operator name" },
      { key: "busType", label: "Bus type" },
      { key: "totalSeats", label: "Total seats" },
      { key: "make", label: "Manufacturer" },
      { key: "model", label: "Model" },
      { key: "year", label: "Year" },
      { key: "amenities", label: "Amenities" },
      { key: "description", label: "Description" },
    ],
  },
  stops: {
    singular: "Stop",
    permission: "stop",
    fields: [
      { key: "name", label: "Stop name", required: true },
      { key: "city", label: "City" },
      { key: "sequence", label: "Sequence", type: "number", required: true },
    ],
  },
};
async function fetchRecord(
  resource: EntityResource,
  id: string,
): Promise<RecordData> {
  const value =
    resource === "agencies"
      ? await api.getAgency(id)
      : resource === "branches"
        ? await api.getBranch(id)
        : resource === "agents"
          ? await api.getAgent(id)
          : resource === "drivers"
            ? await api.getDriver(id)
            : resource === "routes"
              ? await api.getRoute(id)
              : resource === "stops"
                ? await api.getStop(id)
                : await api.getBusById(id);
  return value as unknown as RecordData;
}
function nameOf(record: RecordData, fallback: string) {
  return String(
    record.name ??
      record.busNumber ??
      ([record.firstName, record.lastName].filter(Boolean).join(" ") ||
        fallback),
  );
}

export function EntityRecordPage({
  resource,
  id,
  mode = "detail",
  routeId,
  initialAgencyId,
  initialBranchId,
  initialRoleCode,
}: {
  resource: EntityResource;
  id?: string;
  mode?: "detail" | "edit" | "new";
  routeId?: string;
  initialAgencyId?: string;
  initialBranchId?: string;
  initialRoleCode?: string;
}) {
  const t = useTranslations();
  const locale = useFormattingLocale();
  const { user } = useAuth();
  const router = useRouter();
  const confirm = useConfirmation();
  const config = configurations[resource];
  const base =
    resource === "agents" ? "/dashboard/team" : `/dashboard/${resource}`;
  const [record, setRecord] = useState<RecordData | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    status: "ACTIVE",
    branchId: initialBranchId ?? user?.branchId ?? "",
  });
  const [agencyId, setAgencyId] = useState(
    initialAgencyId ?? user?.agencyId ?? "",
  );
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<api.Branch[]>([]);
  const [roles, setRoles] = useState<api.WorkspaceRole[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [optionsLoading, setOptionsLoading] = useState(mode !== "detail");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const can = (action: string) =>
    (resource !== "agents" ||
      (canManageTeam(user?.role) && (action === "read" || id !== user?.id))) &&
    (user?.role === "SUPER_ADMIN" ||
      Boolean(user?.permissions.includes(`${config.permission}:${action}`)));
  const editableFields = config.fields.filter(
    (field) => !(field.key === "password" && mode !== "new"),
  );
  const parentHref =
    resource === "stops"
      ? `/dashboard/routes/${routeId ?? record?.routeId ?? ""}`
      : base;
  const detailHref = `${base}/${id}`;

  useEffect(() => {
    if (!id) return;
    let active = true;
    void fetchRecord(resource, id)
      .then((value) => {
        if (!active) return;
        setRecord(value);
        setAgencyId(value.agencyId ?? user?.agencyId ?? "");
        const draft: Record<string, string> = {};
        for (const field of config.fields)
          draft[field.key] = String(value[field.key] ?? "");
        draft.status = value.status;
        draft.branchId = String(value.branchId ?? value.branch?.id ?? "");
        draft.roleId = String(value.roleId ?? "");
        if (draft.licenseExpiryDate)
          draft.licenseExpiryDate = draft.licenseExpiryDate.slice(0, 10);
        setForm(draft);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load record",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [resource, id, config, user?.agencyId]);
  useEffect(() => {
    if (
      mode === "detail" ||
      user?.role !== "SUPER_ADMIN" ||
      resource === "agencies" ||
      resource === "stops"
    )
      return;
    let active = true;
    void api
      .getAgencies()
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
  }, [mode, user?.role, resource]);
  useEffect(() => {
    if (mode === "detail") return;
    let active = true;
    void Promise.all([
      agencyId && (resource === "agents" || resource === "drivers")
        ? api.getBranches(agencyId)
        : Promise.resolve([]),
      agencyId && resource === "agents"
        ? api.getWorkspaceRoles(
            user?.role === "SUPER_ADMIN" ? agencyId : undefined,
          )
        : Promise.resolve({ roles: [] }),
    ])
      .then(([branchRows, roleRows]) => {
        if (active) {
          setBranches(branchRows as api.Branch[]);
          setRoles(roleRows.roles);
          if (mode === "new" && initialRoleCode) {
            const initialRole = roleRows.roles.find(
              (role) => role.code === initialRoleCode,
            );
            if (initialRole)
              setForm((current) => ({ ...current, roleId: initialRole.id }));
          }
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load record options",
          );
      })
      .finally(() => {
        if (active) setOptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, agencyId, resource, user?.role, initialRoleCode]);

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !can(mode === "new" ? "create" : "update") ||
      saving ||
      loading ||
      optionsLoading
    )
      return;
    if (resource !== "agencies" && resource !== "stops" && !agencyId) {
      setError("Agency is required.");
      return;
    }
    if (resource === "stops" && !routeId && !record?.routeId) {
      setError("Select a route before adding a stop.");
      return;
    }
    const input: Record<string, unknown> = {};
    for (const field of editableFields) {
      if (
        field.key === "password" ||
        (mode === "edit" && resource === "agents" && field.key === "email")
      )
        continue;
      input[field.key] = (form[field.key] ?? "").trim();
    }
    input.status = form.status;
    if (resource === "drivers") {
      input.branchId = form.branchId;
      input.licenseExpiryDate = form.licenseExpiryDate
        ? `${form.licenseExpiryDate}T00:00:00.000Z`
        : undefined;
    }
    if (resource === "agents") {
      input.branchId =
        user?.role === "BRANCH_ADMIN"
          ? user.branchId
          : form.branchId || (mode === "edit" ? undefined : "");
      input.roleId = form.roleId || undefined;
      if (mode === "new") input.password = form.password || undefined;
    }
    if (resource === "stops") input.sequence = Number(form.sequence);
    if (mode === "new" && (resource === "drivers" || resource === "routes"))
      input.agencyId = agencyId;
    if (
      !(await confirmStatusChange(
        confirm,
        record ? nameOf(record, config.singular) : config.singular,
        record?.status,
        form.status,
      ))
    )
      return;
    setSaving(true);
    setError("");
    try {
      let result: unknown;
      if (mode === "edit" && id) {
        result =
          resource === "agencies"
            ? await api.updateAgency(id, input)
            : resource === "branches"
              ? await api.updateBranch(id, input)
              : resource === "agents"
                ? await api.updateAgent(id, input)
                : resource === "drivers"
                  ? await api.updateDriver(id, input)
                  : resource === "routes"
                    ? await api.updateRoute(id, input)
                    : await api.updateStop(id, input);
      } else {
        if (resource === "agencies")
          result = await api.createAgency(
            input as { name: string; slug: string; email?: string },
          );
        if (resource === "branches")
          result = await api.createBranch(
            agencyId,
            input as { name: string; code: string; email?: string },
          );
        if (resource === "agents")
          result = await api.createAgent(
            agencyId,
            input as { firstName: string; lastName: string; email: string },
          );
        if (resource === "drivers") result = await api.createDriver(input);
        if (resource === "routes") result = await api.createRoute(input);
        if (resource === "stops")
          result = await api.createStop(
            routeId ?? String(record?.routeId),
            input,
          );
      }
      const savedId = id ?? (result as { id?: string } | undefined)?.id;
      router.push(savedId ? `${base}/${savedId}` : parentHref);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save record",
      );
      setSaving(false);
    }
  }
  async function deactivate() {
    if (!id || !record || !can("delete") || saving) return;
    if (
      !(await confirm({
        title: "Deactivate record?",
        description: `${nameOf(record, config.singular)} will become inactive. It will remain available for reference.`,
        confirmLabel: "Deactivate",
      }))
    )
      return;
    setSaving(true);
    setError("");
    try {
      if (resource === "agencies") await api.deactivateAgency(id);
      if (resource === "branches") await api.deactivateBranch(id);
      if (resource === "agents") await api.deactivateAgent(id);
      if (resource === "drivers") await api.deactivateDriverById(id);
      if (resource === "routes") await api.deactivateRouteById(id);
      if (resource === "buses") await api.deactivateBusById(id);
      if (resource === "stops") await api.deactivateStop(id);
      setRecord(await fetchRecord(resource, id));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update record",
      );
    } finally {
      setSaving(false);
    }
  }
  const title =
    mode === "detail"
      ? record
        ? nameOf(record, config.singular)
        : config.singular
      : `${mode === "new" ? "Add" : "Edit"} ${config.singular.toLowerCase()}`;
  const stops = (record?.stops ?? []) as api.Stop[];
  const counts = record?._count as
    { users?: number; branches?: number } | undefined;
  const branchAdmins = (record?.users ?? []) as {
    id: string;
    firstName: string;
    lastName: string;
  }[];
  const summary =
    !record || mode !== "detail"
      ? undefined
      : resource === "branches"
        ? [
            { label: "Team members", value: counts?.users ?? 0 },
            {
              label: "Branch admin",
              value: branchAdmins.length
                ? branchAdmins
                    .map((member) => `${member.firstName} ${member.lastName}`)
                    .join(", ")
                : t("Admin not assigned"),
            },
            { label: "City", value: String(record.city || "—") },
          ]
        : resource === "agencies"
          ? [
              { label: "Branches", value: counts?.branches ?? 0 },
              { label: "Team members", value: counts?.users ?? 0 },
              { label: "Status", value: t(record.status) },
            ]
          : resource === "agents"
            ? [
                {
                  label: "Role",
                  value: record.role
                    ? t(standardRoleNames[record.role.code] ?? record.role.name)
                    : "—",
                },
                { label: "Branch", value: record.branch?.name ?? "—" },
                { label: "Status", value: t(record.status) },
              ]
            : resource === "routes"
              ? [
                  { label: "Source", value: String(record.source ?? "—") },
                  {
                    label: "Destination",
                    value: String(record.destination ?? "—"),
                  },
                  { label: "Stops", value: stops.length },
                ]
              : resource === "buses"
                ? [
                    {
                      label: "Registration number",
                      value: String(record.registrationNumber ?? "—"),
                    },
                    {
                      label: "Total seats",
                      value: String(record.totalSeats ?? "—"),
                    },
                    {
                      label: "Bus type",
                      value: String(record.busType ?? "—").replaceAll("_", " "),
                    },
                  ]
                : [
                    { label: "Status", value: t(record.status) },
                    { label: "Branch", value: record.branch?.name ?? "—" },
                  ];
  return (
    <RecordPage
      title={title}
      summary={summary}
      description={
        mode === "detail"
          ? "Record information and related activity."
          : "Complete the required information below and save your changes."
      }
      backHref={mode === "edit" ? detailHref : parentHref}
      backLabel={mode === "edit" ? "Back to details" : "Back to list"}
      eyebrow={
        mode === "new"
          ? "New record"
          : mode === "edit"
            ? "Edit record"
            : config.singular
      }
      actions={
        mode === "detail" && record ? (
          <>
            <Badge>{record.status}</Badge>
            {can("update") && <EditRecordLink href={`${detailHref}/edit`} />}
          </>
        ) : undefined
      }
    >
      {error && (
        <div className="state-message state-error" role="alert">
          {t(error)}
        </div>
      )}
      {loading ? (
        <div className="state-message" role="status">
          {t("Loading records...")}
        </div>
      ) : mode === "detail" ? (
        record && (
          <>
            <RecordSection title="Overview">
              <RecordFields
                fields={[
                  ...editableFields.map((field) => ({
                    label: field.label,
                    value: Array.isArray(record[field.key])
                      ? (record[field.key] as string[]).join(", ")
                      : field.type === "date" && record[field.key]
                        ? new Date(
                            String(record[field.key]),
                          ).toLocaleDateString(locale, { timeZone: "UTC" })
                        : String(record[field.key] ?? "—"),
                  })),

                  ...(resource === "agents" && record.role
                    ? [
                        {
                          label: "Role",
                          value: t(
                            standardRoleNames[record.role.code] ??
                              record.role.name,
                          ),
                        },
                      ]
                    : []),
                  ...(record.branch
                    ? [
                        {
                          label: "Branch",
                          value: (
                            <Link
                              className="text-link"
                              href={`/dashboard/branches/${record.branch.id}`}
                            >
                              {record.branch.name}
                            </Link>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </RecordSection>
            {resource === "buses" && can("update") && (
              <RecordSection title="Seat layout">
                <p className="record-help">
                  {t(
                    "Manage seat names, availability and the passenger layout.",
                  )}
                </p>
                <Link
                  className="button button-secondary"
                  href={`${detailHref}/edit?step=layout`}
                >
                  {t("Edit seat layout")}
                </Link>
              </RecordSection>
            )}
            {resource === "routes" && (
              <RecordSection title="Stops">
                <DataTable
                  title="Stops"
                  data={stops}
                  rowKey={(stop) => stop.id}
                  searchText={(stop) => `${stop.name} ${stop.city}`}
                  toolbarActions={
                    user?.role === "SUPER_ADMIN" ||
                    user?.permissions.includes("stop:create") ? (
                      <Link
                        href={`/dashboard/stops/new?routeId=${id}`}
                        className="button button-primary"
                      >
                        {t("Add stop")}
                      </Link>
                    ) : undefined
                  }
                  columns={[
                    {
                      id: "name",
                      header: "Stop",
                      render: (stop) => (
                        <Link
                          className="text-link"
                          href={`/dashboard/stops/${stop.id}`}
                        >
                          {stop.name}
                        </Link>
                      ),
                    },
                    {
                      id: "sequence",
                      header: "Sequence",
                      render: (stop) => stop.sequence,
                    },
                    {
                      id: "city",
                      header: "City",
                      render: (stop) => stop.city ?? "—",
                    },
                    {
                      id: "status",
                      header: "Status",
                      render: (stop) => <Badge>{stop.status}</Badge>,
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      render: (stop) =>
                        user?.role === "SUPER_ADMIN" ||
                        user?.permissions.includes("stop:update") ? (
                          <EditRecordLink
                            href={`/dashboard/stops/${stop.id}/edit`}
                          />
                        ) : (
                          "—"
                        ),
                    },
                  ]}
                />
              </RecordSection>
            )}
            {resource === "stops" && (
              <StopPoints id={id!} record={record} canEdit={can("update")} />
            )}
            {resource === "branches" && canManageTeam(user?.role) && (
              <RecordSection
                title="Branch team"
                description="View the people assigned to this operating location."
              >
                <Link
                  className="record-related-link"
                  href={`/dashboard/team?agencyId=${encodeURIComponent(String(record.agencyId))}&branchId=${encodeURIComponent(record.id)}`}
                >
                  {t("View team members")} <ArrowUpRight size={17} />
                </Link>
                {!branchAdmins.length && isAgencyOwner(user?.role) && (
                  <Link
                    className="button button-secondary"
                    href={`/dashboard/team/new?agencyId=${encodeURIComponent(String(record.agencyId))}&branchId=${encodeURIComponent(record.id)}&role=BRANCH_ADMIN`}
                  >
                    {t("Appoint admin")}
                  </Link>
                )}
              </RecordSection>
            )}
            <RecordSection title="Record information">
              <RecordFields
                fields={[
                  { label: "Record ID", value: record.id },
                  {
                    label: "Created",
                    value: record.createdAt
                      ? new Date(String(record.createdAt)).toLocaleDateString(
                          locale,
                        )
                      : "—",
                  },
                ]}
              />
            </RecordSection>
            {can("delete") && (
              <RecordSection
                title="Record status"
                description="Inactive records remain available for reference."
              >
                <Button
                  variant="secondary"
                  disabled={saving || record.status === "INACTIVE"}
                  onClick={() => void deactivate()}
                >
                  <Ban size={15} />
                  {t("Deactivate")}
                </Button>
              </RecordSection>
            )}
          </>
        )
      ) : !can(mode === "new" ? "create" : "update") ? (
        <div className="state-message">
          {t("You do not have permission to change this record.")}
        </div>
      ) : (
        <form className="record-form" onSubmit={(event) => void save(event)}>
          <RecordSection
            title="Record information"
            description="Fields marked with * are required."
          >
            <div className="record-form-grid">
              {user?.role === "SUPER_ADMIN" &&
                resource !== "agencies" &&
                resource !== "stops" && (
                  <label>
                    {t("Agency")}
                    <select
                      required
                      value={agencyId}
                      disabled={mode === "edit"}
                      onChange={(event) => {
                        setAgencyId(event.target.value);
                        setOptionsLoading(true);
                        update("branchId", "");
                        update("roleId", "");
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
                )}
              {editableFields.map((field) => (
                <label key={field.key}>
                  <span>
                    {t(field.label)}
                    {field.required && (
                      <span className="record-required"> *</span>
                    )}
                  </span>
                  {field.type === "textarea" ? (
                    <textarea
                      value={form[field.key] ?? ""}
                      onChange={(event) =>
                        update(field.key, event.target.value)
                      }
                    />
                  ) : (
                    <input
                      type={field.type ?? "text"}
                      value={form[field.key] ?? ""}
                      required={field.required}
                      minLength={field.minLength}
                      min={field.type === "number" ? 1 : undefined}
                      step={field.type === "number" ? 1 : undefined}
                      disabled={
                        mode === "edit" &&
                        resource === "agents" &&
                        field.key === "email"
                      }
                      onChange={(event) =>
                        update(field.key, event.target.value)
                      }
                      autoComplete={
                        field.type === "password" ? "new-password" : undefined
                      }
                    />
                  )}
                  {field.help && (
                    <small className="record-help">{t(field.help)}</small>
                  )}
                </label>
              ))}
              {(resource === "agents" || resource === "drivers") && (
                <label>
                  {t("Branch")}
                  {" *"}
                  <select
                    required={
                      resource === "drivers" ||
                      mode === "new" ||
                      !record?.role ||
                      record.role.isSystem ||
                      record.role.scope === "BRANCH"
                    }
                    value={form.branchId ?? ""}
                    disabled={optionsLoading || user?.role === "BRANCH_ADMIN"}
                    onChange={(event) => update("branchId", event.target.value)}
                  >
                    <option value="">{t("Select branch")}</option>
                    {branches
                      .filter((branch) => branch.status !== "INACTIVE")
                      .map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {resource === "agents" && (
                <label>
                  {t("Role")}
                  <select
                    value={form.roleId ?? ""}
                    disabled={optionsLoading || user?.role === "BRANCH_ADMIN"}
                    onChange={(event) => update("roleId", event.target.value)}
                  >
                    <option value="">{t("Employee (default)")}</option>
                    {roles
                      .filter(
                        (role) =>
                          role.code === "AGENT" ||
                          (isAgencyOwner(user?.role) &&
                            (role.code === "BRANCH_ADMIN" ||
                              role.id === record?.roleId)),
                      )
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {t(standardRoleNames[role.code] ?? role.name)}
                        </option>
                      ))}
                  </select>
                  <small>
                    {t(
                      standardRoleDescriptions[
                        roles.find((role) => role.id === form.roleId)?.code ??
                          "AGENT"
                      ] ?? "Custom access is managed by the agency owner.",
                    )}
                  </small>
                </label>
              )}
              {mode === "edit" && (
                <label>
                  {t("Status")}
                  <select
                    value={form.status}
                    onChange={(event) => update("status", event.target.value)}
                  >
                    <option value="ACTIVE">{t("Active")}</option>
                    <option value="INACTIVE">{t("Inactive")}</option>
                  </select>
                </label>
              )}
            </div>
          </RecordSection>
          <div className="record-form-footer">
            <Link
              href={mode === "edit" ? detailHref : parentHref}
              className="button button-secondary"
            >
              {t("Cancel")}
            </Link>
            <Button type="submit" loading={saving} disabled={optionsLoading}>
              <Save size={15} />
              {t(mode === "new" ? "Create record" : "Save changes")}
            </Button>
          </div>
        </form>
      )}
    </RecordPage>
  );
}

function StopPoints({
  id,
  record,
  canEdit,
}: {
  id: string;
  record: RecordData;
  canEdit: boolean;
}) {
  const t = useTranslations();
  const [pointType, setPointType] = useState("BOARDING");
  const [timeOffset, setTimeOffset] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState(
    (record.points ?? []) as api.Stop["points"],
  );
  return (
    <RecordSection title="Boarding / drop-off">
      <div className="record-permissions">
        {points.map((point) => (
          <Badge key={point.pointType}>{point.pointType}</Badge>
        ))}
      </div>
      {canEdit && (
        <form
          className="record-form"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            setMessage("");
            void api
              .configurePoint(id, {
                pointType,
                timeOffset: timeOffset ? Number(timeOffset) : undefined,
                status: "ACTIVE",
              })
              .then(() => api.getStop(id))
              .then((value) => {
                setPoints(value.points);
                setMessage("Point saved.");
              })
              .catch((cause) =>
                setMessage(
                  cause instanceof Error
                    ? cause.message
                    : "Unable to configure point",
                ),
              )
              .finally(() => setBusy(false));
          }}
        >
          <div className="record-form-grid">
            <label>
              {t("Point type")}
              <select
                value={pointType}
                onChange={(event) => setPointType(event.target.value)}
              >
                {["BOARDING", "DROP_OFF", "BOTH"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              {t("Minutes from route origin")}
              <input
                type="number"
                min="0"
                value={timeOffset}
                onChange={(event) => setTimeOffset(event.target.value)}
              />
            </label>
          </div>
          <Button type="submit" loading={busy}>
            {t("Configure point")}
          </Button>
        </form>
      )}
      {message && <p role="status">{t(message)}</p>}
    </RecordSection>
  );
}
