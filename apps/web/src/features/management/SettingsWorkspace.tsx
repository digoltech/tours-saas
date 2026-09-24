"use client";

import { useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { getDiscountCap, updateDiscountCap } from "../auth/services/api-client";
import { useAuth } from "../auth/components/AuthProvider";

type SettingValues = {
  currency: string;
  baseFare: string;
  commissionType: string;
  commissionValue: string;
  taxName: string;
  taxRate: string;
  cancellationWindowHours: string;
  cancellationFeePercent: string;
};
const defaults: SettingValues = {
  currency: "INR",
  baseFare: "",
  commissionType: "PERCENTAGE",
  commissionValue: "",
  taxName: "GST",
  taxRate: "",
  cancellationWindowHours: "24",
  cancellationFeePercent: "0",
};
const storageKey = "aone-workspace-settings-v1";

export function SettingsWorkspace() {
  const { user } = useAuth();
  const [values, setValues] = useState(defaults);
  const [discountCap, setDiscountCap] = useState({
    type: "PERCENTAGE" as "FIXED" | "PERCENTAGE",
    value: "0",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw)
          setValues({
            ...defaults,
            ...(JSON.parse(raw) as Partial<SettingValues>),
          });
      } catch {
        localStorage.removeItem(storageKey);
      }
      void getDiscountCap()
        .then((cap) =>
          setDiscountCap({ type: cap.type, value: String(cap.value) }),
        )
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function update(key: keyof SettingValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }
  async function save() {
    setError("");
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
      if (user?.role === "AGENCY_ADMIN")
        await updateDiscountCap({
          type: discountCap.type,
          value: Number(discountCap.value),
        });
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save settings",
      );
    }
  }
  return (
    <>
      <PageHeader
        title="Fare and policy settings"
        description="Set the default fare, commission, tax, and cancellation values for this browser workspace."
        action={
          <Button onClick={save}>
            <Save size={16} /> Save settings
          </Button>
        }
      />
      <div className="settings-grid">
        <Card className="settings-card">
          <p className="eyebrow">Fare settings</p>
          <h2>Default fare</h2>
          <label>
            Currency
            <select
              value={values.currency}
              onChange={(e) => update("currency", e.target.value)}
            >
              <option value="INR">INR · Indian rupee</option>
              <option value="USD">USD · US dollar</option>
              <option value="EUR">EUR · Euro</option>
              <option value="GBP">GBP · Pound sterling</option>
            </select>
          </label>
          <label>
            Default one-way fare
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.baseFare}
              onChange={(e) => update("baseFare", e.target.value)}
              placeholder="0.00"
            />
          </label>
        </Card>
        <Card className="settings-card">
          <p className="eyebrow">Commission settings</p>
          <h2>Agent commission</h2>
          <label>
            Commission type
            <select
              value={values.commissionType}
              onChange={(e) => update("commissionType", e.target.value)}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
            </select>
          </label>
          <label>
            {values.commissionType === "PERCENTAGE"
              ? "Commission rate (%)"
              : `Commission amount (${values.currency})`}
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.commissionValue}
              onChange={(e) => update("commissionValue", e.target.value)}
              placeholder="0"
            />
          </label>
        </Card>
        {user?.role === "AGENCY_ADMIN" && (
          <Card className="settings-card">
            <p className="eyebrow">Booking controls</p>
            <h2>Maximum agent discount</h2>
            <label>
              Discount type
              <select
                value={discountCap.type}
                onChange={(e) =>
                  setDiscountCap((v) => ({
                    ...v,
                    type: e.target.value as "FIXED" | "PERCENTAGE",
                  }))
                }
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed amount (INR)</option>
              </select>
            </label>
            <label>
              Maximum discount{" "}
              {discountCap.type === "PERCENTAGE" ? "(%)" : "(INR)"}
              <input
                type="number"
                min="0"
                max={discountCap.type === "PERCENTAGE" ? 100 : 100000}
                step="0.01"
                value={discountCap.value}
                onChange={(e) =>
                  setDiscountCap((v) => ({ ...v, value: e.target.value }))
                }
              />
            </label>
          </Card>
        )}
        <Card className="settings-card">
          <p className="eyebrow">Tax settings</p>
          <h2>Fare tax</h2>
          <label>
            Tax name
            <input
              value={values.taxName}
              onChange={(e) => update("taxName", e.target.value)}
            />
          </label>
          <label>
            Tax rate (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={values.taxRate}
              onChange={(e) => update("taxRate", e.target.value)}
              placeholder="0"
            />
          </label>
        </Card>
        <Card className="settings-card">
          <p className="eyebrow">Cancellation settings</p>
          <h2>Cancellation policy</h2>
          <label>
            Free cancellation window (hours)
            <input
              type="number"
              min="0"
              step="1"
              value={values.cancellationWindowHours}
              onChange={(e) =>
                update("cancellationWindowHours", e.target.value)
              }
            />
          </label>
          <label>
            Cancellation fee after window (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={values.cancellationFeePercent}
              onChange={(e) => update("cancellationFeePercent", e.target.value)}
            />
          </label>
        </Card>
      </div>
      {error && (
        <div className="state-message state-error" role="alert">
          {error}
        </div>
      )}
      {saved && (
        <p className="save-confirmation" role="status">
          <Check size={16} /> Settings saved.
        </p>
      )}
      <p className="muted settings-note">
        Fare, commission, tax, and cancellation settings remain local to this
        browser. The agent discount cap is shared with the agency.
      </p>
    </>
  );
}
