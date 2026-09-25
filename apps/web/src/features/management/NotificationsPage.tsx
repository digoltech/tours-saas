import { Bell, CheckCheck } from "lucide-react";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";

export function NotificationsPage() {
  return <>
    <PageHeader title="Notifications" description="Stay up to date with activity across your workspace." />
    <Card className="notification-empty"><span className="notification-empty-icon"><Bell size={22} /></span><span className="eyebrow">ALL CAUGHT UP</span><h2>No new notifications</h2><p>Important booking and workspace updates will appear here when they are available.</p><div className="notification-empty-status"><CheckCheck size={15} /> You’re up to date</div></Card>
  </>;
}
