"use client";

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
          cause instanceof Error ? cause.message : "Unable to load agencies",
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
            : "Unable to load subscription",
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
          : "Unable to update subscription",
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
        cause instanceof Error ? cause.message : "Unable to create invoice",
      );
    }
  }
  return (
    <>
      <Card className="settings-card">
        <p className="eyebrow">SUPER ADMIN</p>
        <h2>Agency subscription management</h2>
        {error && <p role="alert">{error}</p>}
        <label>
          Agency
          <select
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
            <option value="">Select agency</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </label>
        {agencyId && (
          <>
            <p>Current status: {subscription?.status ?? "No subscription"}</p>
            {subscription?.requestedPlanName && (
              <p>
                Requested: {subscription.requestedPlanName} · INR{" "}
                {Number(subscription.requestedPrice).toFixed(2)}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                Plan
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </label>
              <label>
                Price (INR)
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as SubscriptionContract["status"])
                  }
                >
                  <option value="TRIAL">Trial</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAST_DUE">Past due</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => void save()}>Save subscription</Button>
            </div>
            <hr className="my-4" />
            <h3>Create manual invoice</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Description
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label>
                Amount (INR)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="secondary" onClick={() => void createInvoice()}>
                Create invoice
              </Button>
            </div>
            {invoices.map((invoice) => (
              <p key={invoice.id}>
                {invoice.number} · {invoice.status} · INR{" "}
                {Number(invoice.amount).toFixed(2)}
              </p>
            ))}
          </>
        )}
      </Card>
    </>
  );
}
