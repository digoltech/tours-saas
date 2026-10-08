"use client";
import { DataTable } from "../../ui/DataTable";
import { localizeText } from "../../i18n/errors";
import { Translate } from "../../i18n/Translate";

import "../../styles/transport.css";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EditRecordLink } from "../../ui/RecordPage";
import { Badge } from "../../ui/Badge";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/components/AuthProvider";
import {
  getBuses,
  getDrivers,
  getRoutes,
  type Branch,
  type Bus,
  type Driver,
  type Route,
  getBranches,
  getAgencies,
} from "../auth/services/api-client";

type Resource = "buses" | "drivers" | "routes";
type Row = Bus | Driver | Route;
const copy = {
  buses: [
    "Buses",
    "Keep the fleet available and assigned to the right branch.",
  ],
  drivers: ["Drivers", "Manage licensed drivers and their branch assignments."],
  routes: ["Routes", "Maintain reusable journeys and their ordered stops."],
} as const;

export function TransportPage({ resource }: { resource: Resource }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [busTypeFilter, setBusTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result =
        resource === "buses"
          ? await getBuses({
              page: String(page),
              search,
              status: statusFilter,
              branchId: branchFilter,
              busType: busTypeFilter,
            })
          : resource === "drivers"
            ? await getDrivers({
                page: String(page),
                search,
                status: statusFilter,
                branchId: branchFilter,
              })
            : await getRoutes({
                page: String(page),
                search,
                status: statusFilter,
              });
      setRows(result.data as Row[]);
      setPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to load records"),
      );
    } finally {
      setLoading(false);
    }
  }, [resource, page, search, statusFilter, branchFilter, busTypeFilter]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const loadBranches = async () => {
      if (user?.agencyId) return getBranches(user.agencyId);
      if (user?.role === "SUPER_ADMIN") {
        const agencies = (await getAgencies()) as { id: string }[];
        const lists = await Promise.all(
          agencies.map((agency) => getBranches(agency.id)),
        );
        return lists.flat();
      }
      return [];
    };
    void loadBranches()
      .then((value) => setBranches(value as Branch[]))
      .catch(() => setBranches([]));
  }, [user?.agencyId, user?.role]);
  const permissionBase =
    resource === "buses" ? "bus" : resource === "drivers" ? "driver" : "route";
  const can = (action: string) =>
    user?.role === "SUPER_ADMIN" ||
    Boolean(user?.permissions.includes(`${permissionBase}:${action}`));
  return (
    <>
      <PageHeader title={copy[resource][0]} description={copy[resource][1]} />
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      <DataTable
        title={copy[resource][0]}
        data={rows}
        rowKey={(row) => row.id}
        loading={loading}
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
          ...(resource !== "routes"
            ? [
                {
                  id: "branch",
                  label: "Branch",
                  value: branchFilter,
                  onChange: setBranchFilter,
                  options: branches.map((branch) => ({
                    value: branch.id,
                    label: branch.name,
                  })),
                },
              ]
            : []),
          ...(resource === "buses"
            ? [
                {
                  id: "type",
                  label: "Type",
                  value: busTypeFilter,
                  onChange: setBusTypeFilter,
                  options: ["SEATER", "SLEEPER", "SEATER_SLEEPER"].map(
                    (value) => ({ value, label: value.replaceAll("_", " ") }),
                  ),
                },
              ]
            : []),
        ]}
        pagination={{
          page,
          pageSize: 20,
          total,
          totalPages: pages,
          onPageChange: setPage,
        }}
        toolbarActions={
          can("create") && (
            <Link
              href={`/dashboard/${resource}/new`}
              className="button button-primary"
            >
              <Plus size={16} />
              <Translate text="Add" />{" "}
              {resource === "buses" ? "bus" : resource.slice(0, -1)}
            </Link>
          )
        }
        columns={[
          ...(resource === "buses"
            ? ["Bus", "Registration", "Type", "Seats", "Branch"]
            : resource === "drivers"
              ? ["Name", "Phone", "License", "Branch"]
              : ["Route", "Code", "From", "To", "Stops"]),
          "Status",
          "Actions",
        ].map((header) => ({ id: header, header }))}
        renderRow={(row) => (
          <tr key={row.id}>
            {resource === "buses" ? (
              <>
                <td>
                  <Link
                    className="text-link"
                    href={`/dashboard/buses/${row.id}`}
                  >
                    {(row as Bus).busNumber}
                  </Link>
                </td>
                <td>{(row as Bus).registrationNumber}</td>
                <td>{(row as Bus).busType}</td>
                <td>{(row as Bus).totalSeats}</td>
                <td>{(row as Bus).branch.name}</td>
              </>
            ) : resource === "drivers" ? (
              <>
                <td>
                  <Link
                    className="text-link"
                    href={`/dashboard/drivers/${row.id}`}
                  >
                    {(row as Driver).firstName} {(row as Driver).lastName}
                  </Link>
                </td>
                <td>{(row as Driver).phone}</td>
                <td>{(row as Driver).licenseNumber}</td>
                <td>{(row as Driver).branch.name}</td>
              </>
            ) : (
              <>
                <td>
                  <Link
                    className="text-link"
                    href={`/dashboard/routes/${row.id}`}
                  >
                    {(row as Route).name}
                  </Link>
                </td>
                <td>{(row as Route).code}</td>
                <td>{(row as Route).source}</td>
                <td>{(row as Route).destination}</td>
                <td>{(row as Route)._count?.stops ?? 0}</td>
              </>
            )}
            <td>
              <Badge>{row.status}</Badge>
            </td>
            <td>
              {can("update") ? (
                <EditRecordLink
                  href={`/dashboard/${resource}/${row.id}/edit`}
                />
              ) : (
                "—"
              )}
            </td>
          </tr>
        )}
      />
    </>
  );
}
