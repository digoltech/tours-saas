"use client";

import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, ChevronDown, Inbox, Mail, MessageSquare, Save, Search, Smartphone } from "lucide-react";
import { cn } from "../../lib/utils";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { Button } from "../../ui/Button";
import { SkeletonList } from "../../ui/Skeleton";
import { getNotificationPreferences, getNotifications, markNotificationRead, saveNotificationPreferences } from "../auth/services/api-client";
import type { NotificationPreferences } from "@a-one-tours/shared";

type Notification = Awaited<ReturnType<typeof getNotifications>>["items"][number];
const defaults: NotificationPreferences = { inApp: true, email: true, sms: false, whatsapp: false };
const channels = [
  { key: "inApp", label: "In app", detail: "Updates in your account", icon: Bell },
  { key: "email", label: "Email", detail: "Messages sent to your inbox", icon: Mail },
  { key: "sms", label: "SMS", detail: "Text message updates", icon: Smartphone },
  { key: "whatsapp", label: "WhatsApp", detail: "Messages on WhatsApp", icon: MessageSquare },
] as const;

export function NotificationsPage() {
  const [preferences, setPreferences] = useState(defaults);
  const [items, setItems] = useState<Notification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([getNotificationPreferences(), getNotifications()]).then(([prefs, page]) => {
      if (!active) return;
      if (prefs.status === "fulfilled") setPreferences(prefs.value);
      else setError("Unable to load delivery preferences.");
      if (page.status === "fulfilled") {
        setItems(page.value.items);
        setNextCursor(page.value.nextCursor);
      } else setError("Unable to load notifications. Please refresh the page.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await getNotifications(nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load older notifications.");
    } finally { setLoadingMore(false); }
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setPreferences(await saveNotificationPreferences(preferences));
      setMessage("Delivery preferences saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save preferences.");
    } finally { setSaving(false); }
  }

  async function markRead(id: string) {
    setPendingId(id);
    setError("");
    try {
      await markNotificationRead(id);
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update notification.");
    } finally { setPendingId(null); }
  }

  const unread = items.filter((item) => item.channel === "IN_APP" && item.userId && !item.readAt).length;
  const normalizedQuery = query.trim().toLowerCase();
  const visible = items.filter((item) =>
    (filter === "all" || (item.channel === "IN_APP" && item.userId && !item.readAt)) &&
    (!normalizedQuery || `${item.subject} ${item.message}`.toLowerCase().includes(normalizedQuery))
  );

  return (
    <>
      <PageHeader title="Notifications" description="Your updates and delivery preferences, all in one place." />
      <div className="notifications-layout">
        <section className="notifications-main" aria-label="Notification inbox">
          <div className="notifications-intro">
            <span className="notifications-intro-icon"><Inbox size={22} /></span>
            <div><p className="eyebrow">YOUR INBOX</p><h1>All notifications</h1><p>Review updates across every delivery channel.</p></div>
            {unread > 0 && <span className="notifications-unread-count">{unread} unread</span>}
          </div>
          {error && <div className="state-message state-error" role="alert">{error}</div>}
          <Card className="notifications-panel">
            <div className="notifications-toolbar">
              <div className="notifications-tabs" role="group" aria-label="Filter notifications">
                <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All <span>{items.length}{nextCursor ? "+" : ""}</span></button>
                <button type="button" className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")}>Unread <span>{unread}</span></button>
              </div>
              <label className="notifications-search"><Search size={17} /><span className="sr-only">Search loaded notifications</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notifications" /></label>
            </div>
            {loading ? <SkeletonList rows={5} /> : visible.length ? (
              <div className="notifications-list">
                {visible.map((item) => {
                  const isUnread = item.channel === "IN_APP" && Boolean(item.userId) && !item.readAt;
                  return <article key={item.id} className={cn("notification-row", isUnread && "notification-row-unread")}>
                    <span className={cn("notification-row-icon", isUnread && "notification-row-icon-unread")} aria-hidden="true">{item.channel === "EMAIL" ? <Mail size={19} /> : item.channel === "SMS" ? <Smartphone size={19} /> : item.channel === "WHATSAPP" ? <MessageSquare size={19} /> : <Bell size={19} />}</span>
                    <div className="notification-row-body">
                      <div className="notification-row-heading"><h2>{item.subject.replaceAll("_", " ")}</h2>{isUnread && <span className="notification-new">New</span>}</div>
                      <p>{item.message}</p>
                      <div className="notification-row-meta"><span>{item.channel.replaceAll("_", " ").toLowerCase()}</span><span aria-hidden="true">·</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time><span aria-hidden="true">·</span><span>{item.channel === "IN_APP" ? (!item.userId ? "Agency" : item.readAt ? "Read" : "Unread") : item.status.toLowerCase()}</span></div>
                    </div>
                    {isUnread && <Button variant="secondary" className="notification-read-button" loading={pendingId === item.id} loadingLabel="Saving…" onClick={() => void markRead(item.id)}><Check size={15} /> Mark read</Button>}
                  </article>;
                })}
              </div>
            ) : <div className="notifications-placeholder"><span className="notification-empty-icon">{filter === "unread" ? <CheckCheck size={24} /> : <Bell size={24} />}</span><h2>{items.length ? "Nothing matches this view" : "No notifications yet"}</h2><p>{items.length ? "Try another filter or search." : "Booking and agency updates will appear here."}</p></div>}
            {nextCursor && <div className="notifications-more"><Button variant="secondary" loading={loadingMore} loadingLabel="Loading…" onClick={() => void loadMore()}>Load older notifications <ChevronDown size={16} /></Button></div>}
          </Card>
        </section>
        <aside className="notifications-aside" aria-labelledby="delivery-heading">
          <Card className="notifications-preferences">
            <p className="eyebrow">SETTINGS</p><h2 id="delivery-heading">Delivery preferences</h2><p className="notifications-aside-copy">Choose where you receive updates.</p>
            <div className="notifications-channels">{channels.map(({ key, label, detail, icon: Icon }) => <label key={key} className="notifications-channel"><Icon size={19} /><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={preferences[key]} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} /></label>)}</div>
            <Button className="notifications-save" loading={saving} loadingLabel="Saving…" onClick={() => void save()}><Save size={16} /> Save preferences</Button>
            {message && <p className="notifications-saved" role="status">{message}</p>}
          </Card>
        </aside>
      </div>
    </>
  );
}
