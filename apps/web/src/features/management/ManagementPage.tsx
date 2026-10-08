"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "../../ui/DataTable";
import { EditRecordLink } from "../../ui/RecordPage";
import { Badge } from "../../ui/Badge";
import { PageHeader } from "../../ui/PageHeader";
import { Translate } from "../../i18n/Translate";
import { useAuth } from "../auth/components/AuthProvider";
import {
  getAgencies,
  getAgents,
  getBranches,
} from "../auth/services/api-client";

type Resource = "agencies" | "branches" | "agents";
type Row = Record<string, unknown> & { id: string; status: string };
const labels = {
  agencies: {
    title: "Agencies",
    description: "Manage the organizations operating on the platform.",
  },
  branches: {
    title: "Branches",
    description: "Keep each agency's operating locations accurate.",
  },
  agents: {
    title: "Agents",
    description: "Manage people who sell and coordinate tours.",
  },
};
export function ManagementPage({ resource }: { resource: Resource }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const scopeAgencyId = user?.agencyId ?? selectedAgencyId;
  const singular =
    resource === "agencies"
      ? "agency"
      : resource === "branches"
        ? "branch"
        : "agent";
  const load = useCallback(async () => {
    if (resource !== "agencies" && !scopeAgencyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const values =
        resource === "agencies"
          ? await getAgencies(search, statusFilter)
          : resource === "branches"
            ? await getBranches(scopeAgencyId, search, statusFilter)
            : await getAgents(scopeAgencyId, search, statusFilter);
      setRows(values as Row[]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load records",
      );
    } finally {
      setLoading(false);
    }
  }, [resource, scopeAgencyId, search, statusFilter]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN" || resource === "agencies") return;
    let active = true;
    void getAgencies()
      .then((values) => {
        if (active) {
          const options = values as { id: string; name: string }[];
          setAgencies(options);
          setSelectedAgencyId((current) => current || options[0]?.id || "");
        }
      })
      .catch(() => setAgencies([]));
    return () => {
      active = false;
    };
  }, [resource, user?.role]);
  const can = (action: string) =>
    user?.role === "SUPER_ADMIN" ||
    user?.permissions.includes(`${singular}:${action}`);
  return (
    <>
      <PageHeader
        title={labels[resource].title}
        description={labels[resource].description}
      />
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      <DataTable
        title={labels[resource].title}
        data={rows}
        rowKey={(row) => row.id}
        loading={loading}
        manualFiltering
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${resource}`}
        filters={[
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ],
          },
        ]}
        toolbarActions={
          <>
            {user?.role === "SUPER_ADMIN" && resource !== "agencies" && (
              <label>
                <Translate text="Agency" />
                <select
                  aria-label="Agency"
                  value={selectedAgencyId}
                  onChange={(event) => setSelectedAgencyId(event.target.value)}
                >
                  <option value="">Select agency</option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {can("create") && (
              <Link
                className="button button-primary"
                href={`/dashboard/${resource}/new${scopeAgencyId ? `?agencyId=${encodeURIComponent(scopeAgencyId)}` : ""}`}
              >
                <Plus size={16} />
                <Translate text="Add" /> {singular}
              </Link>
            )}
          </>
        }
        columns={[
          {
            id: "name",
            header: "Name",
            render: (row) => (
              <Link
                className="text-link"
                href={`/dashboard/${resource}/${row.id}`}
              >
                <strong>
                  {String(
                    row.name ?? `${row.firstName ?? ""} ${row.lastName ?? ""}`,
                  )}
                </strong>
              </Link>
            ),
          },
          {
            id: "code",
            header: "Code / email",
            render: (row) => String(row.slug ?? row.code ?? row.email ?? "—"),
          },
          {
            id: "status",
            header: "Status",
            render: (row) => <Badge>{row.status}</Badge>,
          },
          {
            id: "actions",
            header: "Actions",
            render: (row) =>
              can("update") ? (
                <EditRecordLink
                  href={`/dashboard/${resource}/${row.id}/edit`}
                />
              ) : (
                "—"
              ),
          },
        ]}
      />
    </>
  );
}
