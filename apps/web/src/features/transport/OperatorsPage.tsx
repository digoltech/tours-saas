"use client";
import { LocalizedValue } from "../../i18n/LocalizedValue";
import { localizeText } from "../../i18n/errors";
import { Translate } from "../../i18n/Translate";

import "../../styles/transport.css";

import { cn } from "../../lib/utils";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Bus, Search } from "lucide-react";
import { Badge } from "../../ui/Badge";
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
      .filter(([name]) => name.toLowerCase().includes(search.trim().toLowerCase()))
      .sort(([left], [right]) => left.localeCompare(right));
  }, [buses, search]);

  return <>
    <PageHeader title="Operators" description="Review transport operators linked to your fleet." />
    <Card className={cn("operators-toolbar")}><div><span className={cn("eyebrow")}><Translate text={"FLEET PARTNERS"} /></span><h2><Translate text={"Operator directory"} /></h2><p><Translate text={"Operator details are maintained on each bus record."} /></p></div><div className="operators-style-38"><label className={cn("operators-search")}><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search operators" /></label><Link className={cn("button button-secondary")} href="/dashboard/buses"><Bus size={15} /> <Translate text={"Manage buses"} /></Link></div></Card>
    {error && <div className={cn("state-message state-error")} role="alert">{error}</div>}
    {loading ? <div className={cn("state-message")}><Translate text={"Loading operators…"} /></div> : operators.length ? <div className={cn("operators-grid")}>{operators.map(([name, fleet]) => <Card className={cn("operator-card")} key={name}><div className={cn("operator-card-top")}><span className={cn("operator-icon")}><Building2 size={19} /></span><Badge>{fleet.length} <LocalizedValue value={fleet.length === 1 ? "bus" : "buses"} /></Badge></div><h2>{name}</h2><p>{fleet.filter((bus) => bus.status === "ACTIVE").length} <Translate text={"active vehicles ·"} />{" "}{fleet.reduce((seats, bus) => seats + bus.totalSeats, 0)} <Translate text={"seats total"} /></p><div className={cn("operator-bus-list")}>{fleet.slice(0, 4).map((bus) => <div key={bus.id}><span>{bus.busNumber}</span><small>{bus.registrationNumber}</small></div>)}{fleet.length > 4 && <span className={cn("operator-more")}>+{fleet.length - 4} <Translate text={"more vehicles"} /></span>}</div></Card>)}</div> : <Card className={cn("operator-empty")}><span className={cn("operator-icon")}><Building2 size={22} /></span><h2><LocalizedValue value={search ? "No matching operators" : "No operators added yet"} /></h2><p><Translate text={"Add an operator name while creating or editing a bus to see it in this directory."} /></p><Link className={cn("button button-primary")} href="/dashboard/buses"><Translate text={"Open fleet management"} />{" "}<ArrowRight size={15} /></Link></Card>}
  </>;
}
