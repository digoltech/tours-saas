"use client";
import { formatDecimal } from "../../i18n/format-client";
import { localizeText } from "../../i18n/errors";
import { Translate } from "../../i18n/Translate";

import { useEffect, useState } from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import {
  createSubscriptionInvoice,
  getAdminSubscription,
  getAgencies,
  getSubscriptionInvoices,
  updateAdminSubscription,
} from "../auth/services/api-client";
import type { SubscriptionContract } from "@a-one-tours/shared";

type AgencyOption = { id: string; name: string };
export function SubscriptionAdmin() {
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionContract | null>(
    null,
  );
  const [invoices, setInvoices] = useState<
    Awaited<ReturnType<typeof getSubscriptionInvoices>>
  >([]);
  const [planName, setPlanName] = useState("Starter");
  const [price, setPrice] = useState("0");
  const [status, setStatus] = useState<SubscriptionContract["status"]>("TRIAL");
  const [description, setDescription] = useState("Monthly subscription");
  const [invoiceAmount, setInvoiceAmount] = useState("0");
  const [error, setError] = useState("");
  useEffect(() => {
    getAgencies()
      .then((rows) => setAgencies(rows as AgencyOption[]))
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : localizeText("Unable to load agencies"),
        ),
      );
  }, []);
  useEffect(() => {
    if (!agencyId) return;
    Promise.all([
      getAdminSubscription(agencyId),
      getSubscriptionInvoices(agencyId),
    ])
      .then(([sub, bills]) => {
        setSubscription(sub);
        setInvoices(bills);
        if (sub) {
          setPlanName(sub.requestedPlanName ?? sub.planName);
          setPrice(String(sub.requestedPrice ?? sub.price));
          setStatus(sub.status);
        }
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : localizeText("Unable to load subscription"),
        ),
      );
  }, [agencyId]);
  async function save() {
    if (!agencyId) return;
    try {
      setSubscription(
        await updateAdminSubscription(agencyId, {
          planName,
          price: Number(price),
          status,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : localizeText("Unable to update subscription"),
      );
    }
  }
  async function createInvoice() {
    if (!agencyId) return;
    try {
      await createSubscriptionInvoice({
        agencyId,
        description,
        amount: Number(invoiceAmount),
      });
      setInvoices(await getSubscriptionInvoices(agencyId));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : localizeText("Unable to create invoice"),
      );
    }
  }
  return (
    <>
      <Card className="settings-card">
        <p className="eyebrow"><Translate text={"SUPER ADMIN"} /></p>
        <h2><Translate text={"Agency subscription management"} /></h2>
        {error && <p role="alert">{error}</p>}
        <label>
          <Translate text={"Agency"} /><select
            value={agencyId}
            onChange={(e) => {
              const selected = e.target.value;
              setAgencyId(selected);
              if (!selected) {
                setSubscription(null);
                setInvoices([]);
              }
            }}
          >
            <option value=""><Translate text={"Select agency"} /></option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </label>
        {agencyId && (
          <>
            <p><Translate text={"Current status:"} />{" "}{subscription?.status ?? "No subscription"}</p>
            {subscription?.requestedPlanName && (
              <p>
                <Translate text={"Requested:"} />{" "}{subscription.requestedPlanName} <Translate text={"· INR"} />{" "}
                {formatDecimal(Number(subscription.requestedPrice))}
              </p>
            )}
            <div className="subscription-admin-style-132">
              <label>
                <Translate text={"Plan"} /><input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </label>
              <label>
                <Translate text={"Price (INR)"} /><input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <label>
                <Translate text={"Status"} /><select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as SubscriptionContract["status"])
                  }
                >
                  <option value="TRIAL"><Translate text={"Trial"} /></option>
                  <option value="ACTIVE"><Translate text={"Active"} /></option>
                  <option value="PAST_DUE"><Translate text={"Past due"} /></option>
                  <option value="CANCELED"><Translate text={"Canceled"} /></option>
                </select>
              </label>
            </div>
            <div className="subscription-admin-style-164">
              <Button onClick={() => void save()}><Translate text={"Save subscription"} /></Button>
            </div>
            <hr className="subscription-admin-style-167" />
            <h3><Translate text={"Create manual invoice"} /></h3>
            <div className="subscription-admin-style-169">
              <label>
                <Translate text={"Description"} /><input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label>
                <Translate text={"Amount (INR)"} /><input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                />
              </label>
            </div>
            <div className="subscription-admin-style-188">
              <Button variant="secondary" onClick={() => void createInvoice()}>
                <Translate text={"Create invoice"} /></Button>
            </div>
            {invoices.map((invoice) => (
              <p key={invoice.id}>
                {invoice.number} · {invoice.status} <Translate text={"· INR"} />{" "}
                {formatDecimal(Number(invoice.amount))}
              </p>
            ))}
          </>
        )}
      </Card>
    </>
  );
}
