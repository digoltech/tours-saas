"use client";
import { LocalizedValue } from "../../i18n/LocalizedValue";
import { localizeText } from "../../i18n/errors";
import { formatDecimal, getFormattingLocale } from "../../i18n/format-client";
import { Translate } from "../../i18n/Translate";

import { useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import { cn } from "../../lib/utils";
import { useConfirmation } from "../../ui/ConfirmationModal";
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
  const confirm = useConfirmation();
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
      user?.roleScope === "AGENCY" && user?.permissions.includes("agency:update")
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
            cause instanceof Error ? cause.message : localizeText("Unable to load settings"),
          );
      });
    return () => {
      active = false;
    };
  }, [user?.role, user?.roleScope, user?.permissions]);
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
        cause instanceof Error ? cause.message : localizeText("Unable to save settings"),
      );
    }
  }
  async function requestPlan() {
    if (!(await confirm({ title: "Request plan change?", description: `${planName} · ${Number(price).toLocaleString()} per billing period. Submit this plan change for approval?`, confirmLabel: "Request plan", destructive: false }))) return;
    setError("");
    try {
      setSubscription(await requestSubscriptionPlan(planName, Number(price)));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : localizeText("Unable to request plan"),
      );
    }
  }
  async function markPaid(id: string) {
    const reference = window.prompt("Offline payment reference (optional):");
    if (reference === null) return;
    if (!(await confirm({ title: "Record invoice payment?", description: `Mark this invoice as paid via ${paymentMethod}. Confirm that the payment was received.`, confirmLabel: "Mark paid", destructive: false }))) return;
    try {
      await markSubscriptionInvoicePaid(id, paymentMethod, reference);
      setInvoices(await getSubscriptionInvoices());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to record invoice payment"),
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
        title="Agency settings"
        description="Manage your agency profile, ticket branding, and subscription."
      />
      {error && (
        <div className={cn("state-message state-error")} role="alert">
          {error}
        </div>
      )}
      {user?.roleScope === "AGENCY" && user?.permissions.includes("agency:update") && (
        <Card className={cn("settings-card")}>
          <p className={cn("eyebrow")}><Translate text={"AGENCY BRANDING"} /></p>
          <h2><Translate text={"Agency and ticket details"} /></h2>
          {field("name", "Agency name")}
          {field("email", "Contact email", "email")}
          {field("phone", "Contact phone", "tel")}
          {field("logoUrl", "Logo image URL", "url")}
          <div className="settings-style-169">
            {field("brandColor", "Brand color", "color")}
            <label>
              <Translate text={"Currency"} /><select
                value={values.currency}
                onChange={(e) =>
                  setValues((v) => ({ ...v, currency: e.target.value }))
                }
              >
                <option><Translate text={"INR"} /></option>
                <option><Translate text={"USD"} /></option>
                <option><Translate text={"EUR"} /></option>
                <option><Translate text={"GBP"} /></option>
              </select>
            </label>
          </div>
          {field("defaultFare", "Default one-way fare", "number")}
          <div className="settings-style-187">
            <Button onClick={() => void save()}>
              <Save size={15} /> <Translate text={"Save settings"} /></Button>
          </div>
          {saved && (
            <p role="status">
              <Check size={15} /> <Translate text={"Settings saved."} /></p>
          )}
        </Card>
      )}
      {user?.role === "SUPER_ADMIN" ? (
        <SubscriptionAdmin />
      ) : (
        <>
          <Card className={cn("settings-card", "settings-style-203")}>
            <p className={cn("eyebrow")}><Translate text={"SUBSCRIPTION"} /></p>
            <h2>
              {subscription?.planName ?? "Plan"} ·{" "}
              {subscription?.status ?? "Loading"}
            </h2>
            <p>
              <LocalizedValue value={subscription?.status === "TRIAL" && subscription.trialEndsAt
                ? `Trial ends ${new Date(subscription.trialEndsAt).toLocaleDateString(getFormattingLocale())}.`
                : "Plan activation and payment are handled by your account administrator."} />
            </p>
            <div className="settings-style-214">
              <label>
                <Translate text={"Requested plan"} /><input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  maxLength={80}
                />
              </label>
              <label>
                <Translate text={"Monthly price (INR)"} /><input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            </div>
            <div className="settings-style-234">
              <Button variant="secondary" onClick={() => void requestPlan()}>
                <Translate text={"Request plan"} /></Button>
            </div>
          </Card>
          <section className="settings-style-240">
            {user?.role === "AGENCY_ADMIN" && (
              <label>
                <Translate text={"Offline payment method"} /><select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as typeof paymentMethod)
                  }
                >
                  <option value="CASH"><Translate text={"Cash"} /></option>
                  <option value="BANK_TRANSFER"><Translate text={"Bank transfer"} /></option>
                  <option value="CARD"><Translate text={"Card (offline)"} /></option>
                  <option value="UPI"><Translate text={"UPI (offline)"} /></option>
                  <option value="OTHER"><Translate text={"Other"} /></option>
                </select>
              </label>
            )}
            <div className={cn("card-heading")}>
              <div>
                <p className={cn("eyebrow")}><Translate text={"MANUAL BILLING"} /></p>
                <h2><Translate text={"Invoices"} /></h2>
              </div>
            </div>
            {invoices.length ? (
              <div className="settings-style-265">
                {invoices.map((bill) => (
                  <Card key={bill.id}>
                    <strong>{bill.number}</strong>
                    <p>
                      {bill.description} · {bill.currency}{" "}
                      {formatDecimal(Number(bill.amount))}
                    </p>
                    <div className="settings-style-273">
                      <span>
                        {bill.status}
                        {bill.dueAt
                          ? ` · Due ${new Date(bill.dueAt).toLocaleDateString(getFormattingLocale())}`
                          : ""}
                      </span>
                      {user?.role === "AGENCY_ADMIN" &&
                        bill.status === "OPEN" && (
                          <Button
                            variant="secondary"
                            onClick={() => void markPaid(bill.id)}
                          >
                            <Translate text={"Record offline payment"} /></Button>
                        )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><Translate text={"No invoices yet."} /></Card>
            )}
          </section>
        </>
      )}
    </>
  );
}
