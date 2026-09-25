"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FinanceMethod } from "@a-one-tours/shared";
import {
  Activity, ArrowDownRight, ArrowUpRight, Banknote, CalendarDays,
  Download, FileSpreadsheet, FilterX, RefreshCw, Save, Search,
  ShieldCheck, Users, Wallet,
} from "lucide-react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { useAuth } from "../auth/components/AuthProvider";
import {
  cancelBookingFinance, financeExportUrl, getAgencies, getAgents,
  getBookingFinanceByPnr, getBranches, getFinanceLedger,
  getFinanceReports, getFinanceSettings, getTrips, postFinanceSettlement,
  recordBookingPayment, recordBookingRefund, saveFinanceSettings,
} from "../auth/services/api-client";

type FinanceSettings = {
  gstRate: string;
  gstAfterDiscount: boolean;
  commissionType: "FIXED" | "PERCENTAGE";
  commissionValue: string;
  tiers: { hoursBeforeDeparture: string; feePercent: string }[];
};
type FinanceReport = Awaited<ReturnType<typeof getFinanceReports>>;
type FinanceBooking = FinanceReport["bookings"][number];
type FinanceMethodValue = FinanceMethod;
type AgencyOption = { id: string; name: string };
type BranchOption = { id: string; name: string };
type AgentOption = { id: string; firstName: string; lastName: string; email: string };
type TripOption = { id: string; travelDate: string; route: { name: string; source: string; destination: string } };

const defaultSettings: FinanceSettings = {
  gstRate: "0", gstAfterDiscount: true, commissionType: "PERCENTAGE",
  commissionValue: "0", tiers: [],
};
const methods: FinanceMethodValue[] = ["CASH", "BANK_TRANSFER", "CARD", "UPI", "OTHER"];
const money = (value: number | string) => `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export function FinanceWorkspace() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [tripId, setTripId] = useState("");
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [reports, setReports] = useState<FinanceReport | null>(null);
  const [ledger, setLedger] = useState<Record<string, unknown>[]>([]);
  const [pnr, setPnr] = useState("");
  const [booking, setBooking] = useState<Awaited<ReturnType<typeof getBookingFinanceByPnr>> | null>(null);
  const [formAmount, setFormAmount] = useState("");
  const [method, setMethod] = useState<FinanceMethodValue>("CASH");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [party, setParty] = useState<"AGENT" | "OPERATOR">("AGENT");
  const [partyId, setPartyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const canSettings = user?.role === "AGENCY_ADMIN" || user?.role === "SUPER_ADMIN";
  const canSettle = user?.role === "AGENCY_ADMIN";
  const filters = useMemo(() => ({
    ...(user?.role === "SUPER_ADMIN" && agencyId ? { agencyId } : {}),
    ...(branchId ? { branchId } : {}), ...(agentId ? { agentId } : {}),
    ...(tripId ? { tripId } : {}),
  }), [user?.role, agencyId, branchId, agentId, tripId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [report, entries] = await Promise.all([
        getFinanceReports(from || undefined, to || undefined, filters),
        getFinanceLedger(),
      ]);
      setReports(report);
      setLedger(entries);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load finance data");
    } finally {
      setLoading(false);
    }
  }, [from, to, filters]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;
    void getAgencies().then((rows) => {
      const options = rows as AgencyOption[];
      setAgencies(options);
    }).catch(() => setAgencies([]));
  }, [user?.role]);

  const optionAgencyId = user?.agencyId ?? agencyId;
  useEffect(() => {
    if (!optionAgencyId) { setBranches([]); setAgents([]); return; }
    void Promise.all([getBranches(optionAgencyId), getAgents(optionAgencyId)])
      .then(([branchRows, agentRows]) => {
        setBranches(branchRows as BranchOption[]);
        setAgents(agentRows as AgentOption[]);
      })
      .catch(() => { setBranches([]); setAgents([]); });
  }, [optionAgencyId]);

  useEffect(() => {
    void getTrips({ limit: "100" }).then((page) => setTrips(page.data as TripOption[])).catch(() => setTrips([]));
  }, []);

  useEffect(() => {
    if (!canSettings || (user?.role === "SUPER_ADMIN" && !agencyId)) return;
    void getFinanceSettings(user?.role === "SUPER_ADMIN" ? agencyId : undefined)
      .then((value) => setSettings({
        gstRate: String(value.settings?.gstRate ?? 0),
        gstAfterDiscount: value.settings?.gstAfterDiscount ?? true,
        commissionType: value.settings?.commissionType ?? "PERCENTAGE",
        commissionValue: String(value.settings?.commissionValue ?? 0),
        tiers: value.tiers.map((tier) => ({
          hoursBeforeDeparture: String(tier.hoursBeforeDeparture),
          feePercent: String(tier.feePercent),
        })),
      })).catch(() => undefined);
  }, [canSettings, user?.role, agencyId]);

  const dailySales = useMemo(() => {
    const grouped = (reports?.bookings ?? []).reduce<Record<string, { value: number; count: number }>>((days, row) => {
      const date = row.createdAt.slice(0, 10);
      const current = days[date] ?? { value: 0, count: 0 };
      current.value += Number(row.totalAmount);
      current.count += 1;
      days[date] = current;
      return days;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  }, [reports]);
  const chartMax = Math.max(1, ...dailySales.map(([, value]) => value.value));
  const confirmedCount = reports?.bookings.filter((row) => row.status !== "CANCELLED").length ?? 0;
  const cancelledCount = reports?.bookings.filter((row) => row.status === "CANCELLED").length ?? 0;
  const bookingCount = confirmedCount + cancelledCount;
  const cancelledPercent = bookingCount ? (cancelledCount / bookingCount) * 100 : 0;

  function setDateRange(days: number) {
    const today = new Date();
    setTo(localDate(today));
    today.setDate(today.getDate() - days + 1);
    setFrom(localDate(today));
  }
  function clearFilters() {
    setFrom(""); setTo(""); setBranchId(""); setAgentId(""); setTripId("");
    if (user?.role === "SUPER_ADMIN") setAgencyId("");
  }

  async function act(operation: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      await operation(); setMessage(success); await refresh();
      if (booking) setBooking(await getBookingFinanceByPnr(booking.pnr));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Finance action failed");
    } finally { setBusy(false); }
  }

  async function findBooking() {
    if (!pnr.trim()) { setError("Enter a booking PNR first."); return; }
    setError(""); setMessage("");
    try { setBooking(await getBookingFinanceByPnr(pnr.trim())); setFormAmount(""); }
    catch (cause) { setBooking(null); setError(cause instanceof Error ? cause.message : "Booking not found"); }
  }

  async function saveSettings() {
    const gst = Number(settings.gstRate);
    const commission = Number(settings.commissionValue);
    const tiers = settings.tiers.filter((tier) => tier.hoursBeforeDeparture !== "" || tier.feePercent !== "");
    if (!Number.isFinite(gst) || gst < 0 || gst > 100) { setError("GST must be between 0% and 100%."); return; }
    if (!Number.isFinite(commission) || commission < 0 || (settings.commissionType === "PERCENTAGE" && commission > 100)) { setError("Commission must be zero or greater, and a percentage cannot exceed 100%."); return; }
    if (tiers.some((tier) => tier.hoursBeforeDeparture === "" || tier.feePercent === "" || Number(tier.hoursBeforeDeparture) < 0 || Number(tier.feePercent) < 0 || Number(tier.feePercent) > 100)) { setError("Complete each cancellation tier and use a fee between 0% and 100%."); return; }
    await act(() => saveFinanceSettings({
      ...(user?.role === "SUPER_ADMIN" ? { agencyId } : {}),
      gstRate: gst, gstAfterDiscount: settings.gstAfterDiscount,
      commissionType: settings.commissionType, commissionValue: commission,
      tiers: tiers.map((tier) => ({ hoursBeforeDeparture: Number(tier.hoursBeforeDeparture), feePercent: Number(tier.feePercent) })),
    }), "Finance policy saved");
  }

  const stats = [
    { label: "Collected", value: money(reports?.totals.revenue ?? 0), detail: "Payments received", icon: Wallet, color: "mint" },
    { label: "Refunded", value: money(reports?.totals.refunds ?? 0), detail: "Refunds recorded", icon: ArrowDownRight, color: "rose" },
    { label: "Bookings", value: reports?.totals.bookings ?? "—", detail: "In selected period", icon: CalendarDays, color: "blue" },
    { label: "Cancellations", value: reports?.totals.cancellations ?? "—", detail: "Bookings cancelled", icon: Activity, color: "amber" },
    { label: "Occupancy", value: `${reports?.totals.occupancyPercent ?? 0}%`, detail: "Seats sold in selected trips", icon: Users, color: "violet" },
    { label: "Commission", value: money(reports?.totals.commission ?? 0), detail: "Net agent commission", icon: Banknote, color: "teal" },
  ];

  return (
    <>
      <PageHeader
        title="Finance & reports"
        description="Track collections, refunds and commissions across your travel operation."
        action={<Button variant="secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? "finance-spin" : ""} /> Refresh</Button>}
      />

      <div className="finance-toolbar-card">
        <div className="finance-filter-heading">
          <div><span className="finance-overline">REPORT PERIOD</span><strong>Filter your overview</strong></div>
          <div className="finance-presets" aria-label="Date presets">
            <button type="button" onClick={() => { setFrom(""); setTo(""); }}>All time</button>
            <button type="button" onClick={() => setDateRange(7)}>7 days</button>
            <button type="button" onClick={() => setDateRange(30)}>30 days</button>
            <button type="button" onClick={() => setDateRange(90)}>90 days</button>
          </div>
        </div>
        <div className="finance-filters">
          <label>Date from<input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>Date to<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
          {user?.role === "SUPER_ADMIN" && <label>Agency<select value={agencyId} onChange={(event) => { setAgencyId(event.target.value); setBranchId(""); setAgentId(""); setTripId(""); }}><option value="">All agencies</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></label>}
          <label>Branch<select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label>Agent<select value={agentId} onChange={(event) => setAgentId(event.target.value)}><option value="">All agents</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.firstName} {agent.lastName}</option>)}</select></label>
          <label>Trip<select value={tripId} onChange={(event) => setTripId(event.target.value)}><option value="">All trips</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.route.name} · {new Date(trip.travelDate).toLocaleDateString()}</option>)}</select></label>
          <button className="finance-clear-filters" type="button" onClick={clearFilters}><FilterX size={15} /> Clear filters</button>
          <a className="button button-secondary finance-export-button" href={financeExportUrl("excel", from, to, filters)}><FileSpreadsheet size={15} /> Export Excel</a>
          <a className="button button-secondary finance-export-button" href={financeExportUrl("pdf", from, to, filters)}><Download size={15} /> Export PDF</a>
        </div>
      </div>

      {error && <div className="state-message state-error" role="alert">{error}</div>}
      {message && <div className="state-message finance-success" role="status">{message}</div>}

      <div className="dashboard-stats finance-stat-grid">
        {stats.map(({ label, value, detail, icon: Icon, color }) => (
          <Card className="finance-stat-card" key={label}>
            <div className={`finance-stat-icon ${color}`}><Icon size={18} /></div>
            <div className="finance-stat-copy"><span>{label}</span><strong>{loading ? "…" : value}</strong><small>{detail}</small></div>
          </Card>
        ))}
      </div>

      <nav className="finance-section-nav" aria-label="Finance sections">
        <a href="#finance-overview">Overview</a><a href="#finance-bookings">Bookings</a><a href="#finance-actions">Payments &amp; settlements</a>
        {canSettings && <a href="#finance-policy">Policy</a>}<a href="#finance-ledger">Ledger</a>
      </nav>

      <div className="finance-chart-grid" id="finance-overview">
        <Card className="finance-panel finance-revenue-panel">
          <div className="finance-panel-heading"><div><span className="finance-overline">PERFORMANCE</span><h2>Booking value trend</h2><p>Daily confirmed booking value for the selected filters.</p></div><span className="finance-panel-mark"><Activity size={17} /></span></div>
          {dailySales.length ? <div className="finance-line-chart-wrap">
            <svg className="finance-line-chart" viewBox="0 0 720 230" role="img" aria-label="Daily booking value trend">
              {[0, 1, 2, 3].map((line) => <line key={line} x1="42" x2="704" y1={24 + line * 54} y2={24 + line * 54} className="finance-chart-gridline" />)}
              {(() => {
                const points = dailySales.map(([, value], index) => {
                  const x = dailySales.length === 1 ? 373 : 48 + index * (648 / (dailySales.length - 1));
                  const y = 190 - (value.value / chartMax) * 150;
                  return `${x},${y}`;
                }).join(" ");
                const first = points.split(" ")[0]?.split(",");
                const last = points.split(" ").at(-1)?.split(",");
                const fill = first && last ? `${first[0]},190 ${points} ${last[0]},190` : points;
                return <><polygon points={fill} className="finance-chart-area" /><polyline points={points} className="finance-chart-line" />{dailySales.map(([day, value], index) => { const x = dailySales.length === 1 ? 373 : 48 + index * (648 / (dailySales.length - 1)); const y = 190 - (value.value / chartMax) * 150; return <circle key={day} cx={x} cy={y} r="4.5" className="finance-chart-dot"><title>{day}: {money(value.value)} · {value.count} bookings</title></circle>; })}</>;
              })()}
            </svg>
            <div className="finance-chart-labels">{dailySales.filter((_, index) => index === 0 || index === dailySales.length - 1 || index % Math.max(1, Math.ceil(dailySales.length / 5)) === 0).map(([day]) => <span key={day}>{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>)}</div>
          </div> : <div className="finance-chart-empty">{loading ? "Loading report data…" : "No bookings match these filters yet."}</div>}
          <div className="finance-chart-footnote"><span><i className="finance-legend-dot" /> Booking value</span><span>{dailySales.reduce((sum, [, day]) => sum + day.count, 0)} bookings in trend</span></div>
        </Card>

        <Card className="finance-panel finance-mix-panel">
          <div className="finance-panel-heading"><div><span className="finance-overline">CASH FLOW</span><h2>Financial mix</h2><p>Collections and deductions at a glance.</p></div><span className="finance-panel-mark"><Wallet size={17} /></span></div>
          <div className="finance-mix-total"><span>Net collections</span><strong>{money(Number(reports?.totals.revenue ?? 0) - Number(reports?.totals.refunds ?? 0))}</strong></div>
          {([
            ["Collected", Number(reports?.totals.revenue ?? 0), "collected"],
            ["Refunded", Number(reports?.totals.refunds ?? 0), "refunded"],
            ["Commission", Number(reports?.totals.commission ?? 0), "commission"],
          ] as const).map(([label, value, color]) => {
            const max = Math.max(1, Number(reports?.totals.revenue ?? 0), Number(reports?.totals.refunds ?? 0), Number(reports?.totals.commission ?? 0));
            return <div className="finance-mix-row" key={label}><div><span>{label}</span><strong>{money(value)}</strong></div><div className="finance-mix-track"><i className={color} style={{ width: `${Math.max(value > 0 ? 4 : 0, (value / max) * 100)}%` }} /></div></div>;
          })}
          <div className="finance-cancellation-ratio"><div className="finance-donut" style={{ background: `conic-gradient(#c93b32 ${cancelledPercent}%, #deeee9 0)` }}><span>{Math.round(cancelledPercent)}%</span></div><div><strong>Cancellation rate</strong><span>{cancelledCount} cancelled of {bookingCount} bookings</span></div></div>
        </Card>
      </div>

      <Card className="finance-panel finance-bookings-panel" id="finance-bookings">
        <div className="finance-panel-heading finance-table-heading"><div><span className="finance-overline">TRANSACTIONS</span><h2>Recent bookings</h2><p>Booking amounts, tax and commission for the selected period.</p></div><span className="finance-record-count">{reports?.bookings.length ?? 0} records</span></div>
        <div className="table-wrapper"><table><thead><tr><th>Booking</th><th>Date</th><th>Status</th><th>Total</th><th>Tax</th><th>Commission</th><th>Refund</th></tr></thead><tbody>
          {(reports?.bookings ?? []).slice(0, 12).map((row: FinanceBooking) => <tr key={row.id}><td><strong className="finance-pnr">{row.pnr}</strong></td><td>{new Date(row.createdAt).toLocaleDateString()}</td><td><span className={`finance-status ${row.status === "CANCELLED" ? "cancelled" : "confirmed"}`}>{row.status.toLowerCase().replaceAll("_", " ")}</span></td><td>{money(row.totalAmount)}</td><td>{money(row.taxAmount)}</td><td>{money(row.commissionAmount)}</td><td>{money(row.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0))}</td></tr>)}
        </tbody></table>{!loading && reports?.bookings.length === 0 && <div className="finance-chart-empty">No bookings in this date range. Try widening the dates or clearing a filter.</div>}</div>
      </Card>

      <div className="finance-section-heading" id="finance-actions"><div><span className="finance-overline">FINANCE OPERATIONS</span><h2>Payments, refunds and settlements</h2></div><p>Record manual transactions and manage your agency policy.</p></div>
      <div className="finance-workflow-grid">
        <Card className="finance-panel finance-operation-card">
          <div className="finance-panel-heading"><div><span className="finance-overline">BOOKING COLLECTIONS</span><h2>Payment & refund records</h2><p>Find a booking to record a payment, cancellation or refund.</p></div><span className="finance-panel-mark"><Banknote size={17} /></span></div>
          <div className="finance-inline-search"><label>Booking PNR<input value={pnr} onChange={(event) => setPnr(event.target.value)} placeholder="Enter a booking PNR" /></label><Button variant="secondary" onClick={() => void findBooking()}><Search size={15} /> Find booking</Button></div>
          {booking && <div className="finance-booking-detail"><div className="finance-booking-summary"><strong>{booking.pnr}</strong><span className={`finance-status ${booking.status === "CANCELLED" ? "cancelled" : "confirmed"}`}>{booking.status.toLowerCase()}</span><span>Booking total <b>{money(booking.totalAmount)}</b></span><span>GST <b>{money(booking.taxAmount)}</b></span>{booking.cancellation && <span>Eligible refund <b>{money(booking.cancellation.eligibleRefund)}</b></span>}</div>
            <div className="finance-entry-grid"><label>Amount<input type="number" min="0.01" step="0.01" value={formAmount} onChange={(event) => setFormAmount(event.target.value)} placeholder="0.00" /></label><label>Method<select value={method} onChange={(event) => setMethod(event.target.value as FinanceMethodValue)}>{methods.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label>Reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Optional receipt/reference" /></label></div>
            <div className="finance-button-row"><Button disabled={busy || !(Number(formAmount) > 0) || booking.status !== "CONFIRMED"} onClick={() => void act(() => recordBookingPayment(booking.id, { amount: Number(formAmount), method, reference }), "Payment recorded successfully")}>Record payment</Button><Button variant="secondary" disabled={busy || booking.status === "CANCELLED"} onClick={() => void act(() => cancelBookingFinance(booking.id), "Booking cancelled and seats released")}>Cancel booking</Button><Button variant="secondary" disabled={busy || booking.status !== "CANCELLED" || !(Number(formAmount) > 0)} onClick={() => void act(() => recordBookingRefund(booking.id, { amount: Number(formAmount), method, reference }), "Refund recorded successfully")}>Record refund</Button></div>
            <div className="finance-history-lines"><span><ArrowUpRight size={14} /> Payments: {booking.payments.map((payment) => `${money(payment.amount)} ${payment.method}${payment.reference ? ` (${payment.reference})` : ""}`).join(" · ") || "No payments recorded"}</span><span><ArrowDownRight size={14} /> Refunds: {booking.refunds.map((refund) => `${money(refund.amount)} ${refund.method}${refund.reference ? ` (${refund.reference})` : ""}`).join(" · ") || "No refunds recorded"}</span></div>
          </div>}
        </Card>

        {canSettle && <Card className="finance-panel finance-operation-card">
          <div className="finance-panel-heading"><div><span className="finance-overline">AGENT & OPERATOR BALANCES</span><h2>Post a settlement</h2><p>Record a direct payment against an agency balance.</p></div><span className="finance-panel-mark"><ShieldCheck size={17} /></span></div>
          <div className="finance-entry-grid"><label>Settlement party<select value={party} onChange={(event) => { const next = event.target.value as "AGENT" | "OPERATOR"; setParty(next); setPartyId(next === "OPERATOR" ? user?.agencyId ?? "" : ""); }}><option value="AGENT">Agent commission</option><option value="OPERATOR">Trip agency / operator</option></select></label>{party === "AGENT" ? <label>Agent<select value={partyId} onChange={(event) => setPartyId(event.target.value)}><option value="">Select an agent</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.firstName} {agent.lastName} · {agent.email}</option>)}</select></label> : <label>Operator agency<input value={user?.agencyName ?? ""} readOnly /></label>}<label>Amount<input type="number" min="0.01" step="0.01" value={formAmount} onChange={(event) => setFormAmount(event.target.value)} placeholder="0.00" /></label><label>Method<select value={method} onChange={(event) => setMethod(event.target.value as FinanceMethodValue)}>{methods.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label>Reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Optional reference" /></label></div>
          <div className="finance-button-row"><Button disabled={busy || !partyId || !(Number(formAmount) > 0)} onClick={() => void act(() => postFinanceSettlement({ party, partyId, amount: Number(formAmount), method, reference }), "Settlement posted successfully")}>Post settlement</Button></div>
        </Card>}
      </div>

      <div className="finance-lower-grid">
        {canSettings && <Card className="finance-panel finance-policy-card" id="finance-policy">
          <div className="finance-panel-heading"><div><span className="finance-overline">AGENCY POLICY</span><h2>Tax, commission & cancellation</h2><p>Set the defaults applied to new bookings.</p></div><Button onClick={() => void saveSettings()} disabled={busy}><Save size={15} /> Save policy</Button></div>
          {user?.role === "SUPER_ADMIN" && <label className="finance-policy-agency">Agency<select value={agencyId} onChange={(event) => setAgencyId(event.target.value)}><option value="">Select agency to manage policy</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></label>}
          <div className="finance-entry-grid"><label>GST rate (%)<input type="number" min="0" max="100" step="0.01" value={settings.gstRate} onChange={(event) => setSettings({ ...settings, gstRate: event.target.value })} /></label><label>GST basis<select value={String(settings.gstAfterDiscount)} onChange={(event) => setSettings({ ...settings, gstAfterDiscount: event.target.value === "true" })}><option value="true">After discount</option><option value="false">Before discount</option></select></label><label>Commission type<select value={settings.commissionType} onChange={(event) => setSettings({ ...settings, commissionType: event.target.value as FinanceSettings["commissionType"] })}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed per seat</option></select></label><label>Commission value<input type="number" min="0" step="0.01" value={settings.commissionValue} onChange={(event) => setSettings({ ...settings, commissionValue: event.target.value })} /></label></div>
          <div className="finance-tier-heading"><div><h3>Cancellation tiers</h3><p>Fee percentage applied by hours before departure.</p></div><Button variant="secondary" onClick={() => setSettings({ ...settings, tiers: [...settings.tiers, { hoursBeforeDeparture: "24", feePercent: "0" }] })}>Add tier</Button></div>
          {settings.tiers.length === 0 && <p className="finance-policy-empty">No cancellation tiers configured yet.</p>}
          {settings.tiers.map((tier, index) => <div className="finance-tier-row" key={index}><label>Hours before departure<input type="number" min="0" step="0.5" value={tier.hoursBeforeDeparture} onChange={(event) => setSettings({ ...settings, tiers: settings.tiers.map((item, i) => i === index ? { ...item, hoursBeforeDeparture: event.target.value } : item) })} /></label><label>Cancellation fee (%)<input type="number" min="0" max="100" step="0.01" value={tier.feePercent} onChange={(event) => setSettings({ ...settings, tiers: settings.tiers.map((item, i) => i === index ? { ...item, feePercent: event.target.value } : item) })} /></label><button className="finance-remove-tier" type="button" onClick={() => setSettings({ ...settings, tiers: settings.tiers.filter((_, i) => i !== index) })}>Remove</button></div>)}
        </Card>}
        <Card className="finance-panel finance-ledger-card" id="finance-ledger">
          <div className="finance-panel-heading"><div><span className="finance-overline">ACCOUNT ACTIVITY</span><h2>Recent ledger entries</h2><p>Latest posted finance movements.</p></div><span className="finance-record-count">{ledger.length} entries</span></div>
          <div className="finance-ledger-list">{ledger.slice(0, 8).map((entry, index) => <div className="finance-ledger-row" key={String(entry.id ?? index)}><span className="finance-ledger-icon"><Activity size={15} /></span><div><strong>{String(entry.description ?? entry.type ?? "Ledger entry")}</strong><small>{new Date(String(entry.createdAt)).toLocaleDateString()} · {String(entry.party ?? "Account")}</small></div><b>{money(String(entry.amount ?? 0))}</b></div>)}{ledger.length === 0 && <div className="finance-chart-empty">No ledger activity in this workspace yet.</div>}</div>
        </Card>
      </div>
    </>
  );
}
