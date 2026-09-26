"use client";

import { useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import {
  getAgencySettings,
  getSubscription,
  getSubscriptionInvoices,
  markSubscriptionInvoicePaid,
  requestSubscriptionPlan,
  saveAgencySettings,
} from "../auth/services/api-client";
import { useAuth } from "../auth/components/AuthProvider";
import type { AgencyBranding, SubscriptionContract } from "@a-one-tours/shared";
import { SubscriptionAdmin } from "./SubscriptionAdmin";

type Values = {
  name: string;
  email: string;
  phone: string;
  brandColor: string;
  logoUrl: string;
  currency: string;
  defaultFare: string;
};
const empty: Values = {
  name: "",
  email: "",
  phone: "",
  brandColor: "#c62828",
  logoUrl: "",
  currency: "INR",
  defaultFare: "0",
};
export function SettingsWorkspace() {
  const { user } = useAuth();
  const [values, setValues] = useState(empty);
  const [subscription, setSubscription] = useState<SubscriptionContract | null>(
    null,
  );
  const [invoices, setInvoices] = useState<
    Awaited<ReturnType<typeof getSubscriptionInvoices>>
  >([]);
  const [planName, setPlanName] = useState("Starter");
  const [price, setPrice] = useState("0");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "BANK_TRANSFER" | "CARD" | "UPI" | "OTHER"
  >("CASH");
  useEffect(() => {
    let active = true;
    const agencyRequest =
      user?.role === "AGENCY_ADMIN"
        ? getAgencySettings()
        : Promise.resolve(null);
    Promise.all([
      agencyRequest,
      user?.role === "SUPER_ADMIN" ? Promise.resolve(null) : getSubscription(),
      user?.role === "SUPER_ADMIN"
        ? Promise.resolve([])
        : getSubscriptionInvoices(),
    ])
      .then(([agency, sub, bills]) => {
        if (!active) return;
        if (agency)
          setValues({
            name: agency.name,
            email: agency.email ?? "",
            phone: agency.phone ?? "",
            brandColor: agency.brandColor,
            logoUrl: agency.logoUrl ?? "",
            currency: agency.currency,
            defaultFare: String(agency.defaultFare),
          });
        setSubscription(sub);
        if (sub) {
          setPlanName(sub.requestedPlanName ?? sub.planName);
          setPrice(String(sub.requestedPrice ?? sub.price));
        }
        setInvoices(bills);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Unable to load settings",
          );
      });
    return () => {
      active = false;
    };
  }, [user?.role]);
  async function save() {
    setError("");
    setSaved(false);
    try {
      const result: AgencyBranding = await saveAgencySettings({
        ...values,
        logoUrl: values.logoUrl || null,
        email: values.email || null,
        phone: values.phone || null,
        defaultFare: Number(values.defaultFare),
      });
      setValues((v) => ({ ...v, name: result.name }));
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save settings",
      );
    }
  }
  async function requestPlan() {
    setError("");
    try {
      setSubscription(await requestSubscriptionPlan(planName, Number(price)));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to request plan",
      );
    }
  }
  async function markPaid(id: string) {
    const reference = window.prompt("Offline payment reference (optional):");
    if (reference === null) return;
    try {
      await markSubscriptionInvoicePaid(id, paymentMethod, reference);
      setInvoices(await getSubscriptionInvoices());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to record invoice payment",
      );
    }
  }
  const field = (key: keyof Values, label: string, type = "text") => (
    <label>
      {label}
      <input
        type={type}
        value={values[key]}
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
      />
    </label>
  );
  return (
    <>
      <PageHeader
        title="Workspace settings"
        description="Manage your agency profile, ticket branding, and subscription."
      />
      {error && (
        <div className={cn("state-message state-error")} role="alert">
          {error}
        </div>
      )}
      {user?.role === "AGENCY_ADMIN" && (
        <Card className={cn("settings-card")}>
          <p className={cn("eyebrow")}>AGENCY BRANDING</p>
          <h2>Workspace and ticket details</h2>
          {field("name", "Agency name")}
          {field("email", "Contact email", "email")}
          {field("phone", "Contact phone", "tel")}
          {field("logoUrl", "Logo image URL", "url")}
          <div className="grid grid-cols-2 gap-3">
            {field("brandColor", "Brand color", "color")}
            <label>
              Currency
              <select
                value={values.currency}
                onChange={(e) =>
                  setValues((v) => ({ ...v, currency: e.target.value }))
                }
              >
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </label>
          </div>
          {field("defaultFare", "Default one-way fare", "number")}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => void save()}>
              <Save size={15} /> Save settings
            </Button>
          </div>
          {saved && (
            <p role="status">
              <Check size={15} /> Settings saved.
            </p>
          )}
        </Card>
      )}
      {user?.role === "SUPER_ADMIN" ? (
        <SubscriptionAdmin />
      ) : (
        <>
          <Card className={cn("settings-card", "mt-5")}>
            <p className={cn("eyebrow")}>SUBSCRIPTION</p>
            <h2>
              {subscription?.planName ?? "Plan"} ·{" "}
              {subscription?.status ?? "Loading"}
            </h2>
            <p>
              {subscription?.status === "TRIAL" && subscription.trialEndsAt
                ? `Trial ends ${new Date(subscription.trialEndsAt).toLocaleDateString()}.`
                : "Plan activation and payment are handled by your account administrator."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Requested plan
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  maxLength={80}
                />
              </label>
              <label>
                Monthly price (INR)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => void requestPlan()}>
                Request plan
              </Button>
            </div>
          </Card>
          <section className="mt-5">
            {user?.role === "AGENCY_ADMIN" && (
              <label>
                Offline payment method
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as typeof paymentMethod)
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CARD">Card (offline)</option>
                  <option value="UPI">UPI (offline)</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
            )}
            <div className={cn("card-heading")}>
              <div>
                <p className={cn("eyebrow")}>MANUAL BILLING</p>
                <h2>Invoices</h2>
              </div>
            </div>
            {invoices.length ? (
              <div className="grid gap-3">
                {invoices.map((bill) => (
                  <Card key={bill.id}>
                    <strong>{bill.number}</strong>
                    <p>
                      {bill.description} · {bill.currency}{" "}
                      {Number(bill.amount).toFixed(2)}
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {bill.status}
                        {bill.dueAt
                          ? ` · Due ${new Date(bill.dueAt).toLocaleDateString()}`
                          : ""}
                      </span>
                      {user?.role === "AGENCY_ADMIN" &&
                        bill.status === "OPEN" && (
                          <Button
                            variant="secondary"
                            onClick={() => void markPaid(bill.id)}
                          >
                            Record offline payment
                          </Button>
                        )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>No invoices yet.</Card>
            )}
          </section>
        </>
      )}
    </>
  );
}
