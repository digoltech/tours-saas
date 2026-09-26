"use client";

import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Save } from "lucide-react";
import { cn } from "../../lib/utils";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { Button } from "../../ui/Button";
import {
  getNotificationPreferences,
  getNotifications,
  markNotificationRead,
  saveNotificationPreferences,
} from "../auth/services/api-client";
import type { NotificationPreferences } from "@a-one-tours/shared";

const defaults: NotificationPreferences = {
  inApp: true,
  email: true,
  sms: false,
  whatsapp: false,
};
export function NotificationsPage() {
  const [preferences, setPreferences] = useState(defaults);
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof getNotifications>>
  >([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([getNotificationPreferences(), getNotifications()])
      .then(([prefs, rows]) => {
        if (active) {
          setPreferences(prefs);
          setItems(rows);
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load notifications",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  async function save() {
    setError("");
    setMessage("");
    try {
      setPreferences(await saveNotificationPreferences(preferences));
      setMessage("Notification preferences saved.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save preferences",
      );
    }
  }
  async function markRead(id: string) {
    try {
      await markNotificationRead(id);
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update notification",
      );
    }
  }
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Review booking updates and choose where customer notifications are sent."
      />
      {error && (
        <div className={cn("state-message state-error")} role="alert">
          {error}
        </div>
      )}
      <Card className={cn("settings-card")}>
        <p className={cn("eyebrow")}>DELIVERY PREFERENCES</p>
        <h2>Channels</h2>
        <div className={cn("notification-preferences")}>
          {(
            [
              ["inApp", "In app"],
              ["email", "Email"],
              ["sms", "SMS"],
              ["whatsapp", "WhatsApp"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    [key]: event.target.checked,
                  }))
                }
              />{" "}
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => void save()}>
            <Save size={15} /> Save preferences
          </Button>
        </div>
        {message && <p role="status">{message}</p>}
      </Card>
      <section className="mt-5">
        <div className={cn("card-heading")}>
          <div>
            <p className={cn("eyebrow")}>WORKSPACE ACTIVITY</p>
            <h2>Recent notifications</h2>
          </div>
        </div>
        {items.length ? (
          <div className="grid gap-3">
            {items.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cn("eyebrow")}>
                      {item.subject.replaceAll("_", " ")} ·{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <p>{item.message}</p>
                    <span className={cn("muted")}>
                      {item.status.toLowerCase()}
                    </span>
                  </div>
                  {!item.readAt && (
                    <Button
                      variant="secondary"
                      onClick={() => void markRead(item.id)}
                    >
                      <Check size={14} /> Mark read
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className={cn("notification-empty")}>
            <span className={cn("notification-empty-icon")}>
              <Bell size={22} />
            </span>
            <span className={cn("eyebrow")}>ALL CAUGHT UP</span>
            <h2>No notifications yet</h2>
            <p>Booking and cancellation updates will appear here.</p>
            <div className={cn("notification-empty-status")}>
              <CheckCheck size={15} /> You’re up to date
            </div>
          </Card>
        )}
      </section>
    </>
  );
}
