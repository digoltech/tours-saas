"use client";
import { DataTable } from "../../ui/DataTable";
import { localizeText } from "../../i18n/errors";
import { Translate } from "../../i18n/Translate";

import "../../styles/transport.css";

import { cn } from "../../lib/utils";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bus } from "lucide-react";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { getBuses, type Bus as FleetBus } from "../auth/services/api-client";

export function OperatorsPage() {
  const [buses, setBuses] = useState<FleetBus[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void getBuses({ limit: "100" }).then((page) => setBuses(page.data))
      .catch((cause) => setError(cause instanceof Error ? cause.message : localizeText("Unable to load operators")))
      .finally(() => setLoading(false));
  }, []);

  const operators = useMemo(() => {
    const grouped = new Map<string, FleetBus[]>();
    for (const bus of buses) {
      const name = bus.operatorName?.trim();
      if (!name) continue;
      grouped.set(name, [...(grouped.get(name) ?? []), bus]);
    }
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right));
  }, [buses]);

  return <>
    <PageHeader title="Operators" description="Review transport operators linked to your fleet." />
    <Card className={cn("operators-toolbar")}><div><span className={cn("eyebrow")}><Translate text={"FLEET PARTNERS"} /></span><h2><Translate text={"Operator directory"} /></h2><p><Translate text={"Operator details are maintained on each bus record."} /></p></div><div className="operators-style-38"><Link className={cn("button button-secondary")} href="/dashboard/buses"><Bus size={15} /> <Translate text={"Manage buses"} /></Link></div></Card>
    {error && <div className={cn("state-message state-error")} role="alert">{error}</div>}
    <DataTable title="Operators" data={operators} rowKey={([name]) => name} loading={loading}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search operators" searchText={([name]) => name}
      columns={[
        { id: "name", header: "Operator", render: ([name]) => <Link className="text-link" href={`/dashboard/operators/${encodeURIComponent(name)}`}><strong>{name}</strong></Link> },
        { id: "fleet", header: "Buses", render: ([, fleet]) => fleet.length },
        { id: "active", header: "Active vehicles", render: ([, fleet]) => fleet.filter((bus) => bus.status === "ACTIVE").length },
        { id: "seats", header: "Total seats", render: ([, fleet]) => fleet.reduce((seats, bus) => seats + bus.totalSeats, 0) },
      ]}
    />
  </>;
}
