"use client";

import { cn } from "../../lib/utils";
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
};
const defaults: SettingValues = {
  currency: "INR",
  baseFare: "",
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
    const baseFare = Number(values.baseFare);
    const discountValue = Number(discountCap.value);
    if (values.baseFare !== "" && (!Number.isFinite(baseFare) || baseFare < 0)) {
      setError("Default fare must be a valid amount of zero or greater.");
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue < 0 || (discountCap.type === "PERCENTAGE" && discountValue > 100)) {
      setError("Discount must be zero or greater, and a percentage cannot exceed 100%.");
      return;
    }
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
        description="Set booking defaults and agency discount limits. Tax, commission, and cancellation policy live in Finance & reports."
      />
      <div className={cn("settings-grid")}>
        <Card className={cn("settings-card")}>
          <p className={cn("eyebrow")}>Fare settings</p>
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
        {user?.role === "AGENCY_ADMIN" && (
          <Card className={cn("settings-card")}>
            <p className={cn("eyebrow")}>Booking controls</p>
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
      </div>
      {error && (
        <div className={cn("state-message state-error")} role="alert">
          {error}
        </div>
      )}
      {saved && (
        <p className={cn("save-confirmation")} role="status">
          <Check size={16} /> Settings saved.
        </p>
      )}
      <div className="mt-4 flex justify-end"><Button onClick={save}><Save size={16} /> Save settings</Button></div>
      <p className={cn("muted settings-note")}>
        The fare default is local to this browser. Discount limits are shared
        with the agency; finance policies are managed in Finance &amp; reports.
      </p>
    </>
  );
}
