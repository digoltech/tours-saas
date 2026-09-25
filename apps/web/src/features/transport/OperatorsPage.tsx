"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Bus, Search } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
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
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load operators"))
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
      .filter(([name]) => name.toLowerCase().includes(search.trim().toLowerCase()))
      .sort(([left], [right]) => left.localeCompare(right));
  }, [buses, search]);

  return <>
    <PageHeader title="Operators" description="Review transport operators linked to your fleet." action={<Link className="button button-secondary" href="/dashboard/buses"><Bus size={15} /> Manage buses</Link>} />
    <Card className="operators-toolbar"><div><span className="eyebrow">FLEET PARTNERS</span><h2>Operator directory</h2><p>Operator details are maintained on each bus record.</p></div><label className="operators-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search operators" /></label></Card>
    {error && <div className="state-message state-error" role="alert">{error}</div>}
    {loading ? <div className="state-message">Loading operators…</div> : operators.length ? <div className="operators-grid">{operators.map(([name, fleet]) => <Card className="operator-card" key={name}><div className="operator-card-top"><span className="operator-icon"><Building2 size={19} /></span><Badge>{fleet.length} {fleet.length === 1 ? "bus" : "buses"}</Badge></div><h2>{name}</h2><p>{fleet.filter((bus) => bus.status === "ACTIVE").length} active vehicles · {fleet.reduce((seats, bus) => seats + bus.totalSeats, 0)} seats total</p><div className="operator-bus-list">{fleet.slice(0, 4).map((bus) => <div key={bus.id}><span>{bus.busNumber}</span><small>{bus.registrationNumber}</small></div>)}{fleet.length > 4 && <span className="operator-more">+{fleet.length - 4} more vehicles</span>}</div></Card>)}</div> : <Card className="operator-empty"><span className="operator-icon"><Building2 size={22} /></span><h2>{search ? "No matching operators" : "No operators added yet"}</h2><p>Add an operator name while creating or editing a bus to see it in this directory.</p><Link className="button button-primary" href="/dashboard/buses">Open fleet management</Link></Card>}
  </>;
}
