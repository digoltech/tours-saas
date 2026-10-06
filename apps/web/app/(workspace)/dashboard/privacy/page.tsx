"use client";

import "../../../../src/styles/privacy.css";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Download, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../../src/features/auth/components/AuthProvider";
import { downloadPrivacyExport, getPrivacyRequests, reviewPrivacyRequest, submitStaffPrivacyRequest, type PrivacyRequestRecord } from "../../../../src/features/auth/services/api-client";
import { Card } from "../../../../src/ui/Card";
import { Button } from "../../../../src/ui/Button";
import { PageHeader } from "../../../../src/ui/PageHeader";
import { SkeletonList } from "../../../../src/ui/Skeleton";

export default function PrivacyWorkspacePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PrivacyRequestRecord[]>([]);
  const [type, setType] = useState<"ACCESS" | "ERASURE">("ACCESS");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const canReview = user?.role === "SUPER_ADMIN" || user?.role === "AGENCY_ADMIN";
  const load = useCallback(async () => {
    try { setRows(await getPrivacyRequests()); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load requests"); }
  }, []);
  useEffect(() => {
    let active = true;
    getPrivacyRequests().then((result) => { if (active) setRows(result); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Unable to load requests"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy("submit"); setMessage("");
    try { await submitStaffPrivacyRequest({ type, reason }); setReason(""); await load(); setMessage("Request submitted."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit request"); }
    finally { setBusy(null); }
  }

  async function review(id: string, action: "VERIFY" | "REJECT" | "RETAIN" | "COMPLETE") {
    if (note.trim().length < 10) { setMessage("Enter a review note of at least 10 characters."); return; }
    setBusy(`${id}:${action}`); setMessage("");
    try { await reviewPrivacyRequest(id, action, note.trim()); await load(); setMessage("Review saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to review request"); }
    finally { setBusy(null); }
  }

  async function exportRequest(id: string) {
    setBusy(`${id}:EXPORT`); setMessage("");
    try { await downloadPrivacyExport(id); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Export failed"); }
    finally { setBusy(null); }
  }

  return <>
    <PageHeader title="Privacy requests" description="Request your data or review verified passenger and staff requests." />
    <div className="privacy-hero"><span><LockKeyhole size={24} /></span><div><p className="eyebrow">YOUR DATA, YOUR CONTROL</p><h1>Privacy requests</h1><p>Track access and deletion requests in one place.</p></div></div>
    {message && <p className="privacy-message" role="status">{message}</p>}
    <div className="privacy-layout">
      <Card className="privacy-card"><div className="privacy-card-heading"><FileText size={20} /><div><h2>Request your account data</h2><p>Tell us what you need. We’ll review your request and update its status here.</p></div></div><form className="privacy-form" onSubmit={submit}>
        <label>Request type<select value={type} disabled={busy !== null} onChange={(event) => setType(event.target.value as "ACCESS" | "ERASURE")}><option value="ACCESS">Access my data</option><option value="ERASURE">Request deletion review</option></select></label>
        <label>Details<textarea value={reason} disabled={busy !== null} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder="Tell us about the data you need help with" /></label>
        <Button type="submit" disabled={busy !== null} loading={busy === "submit"} loadingLabel="Submitting…">Submit request</Button>
      </form></Card>
      {canReview && <Card className="privacy-card privacy-review"><div className="privacy-card-heading"><ShieldCheck size={20} /><div><h2>Review requests</h2><p>Confirm identity outside this page before verifying a request. Release exports only after verification.</p></div></div><label>Review note<textarea value={note} disabled={busy !== null} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Record how identity was checked or why you made this decision" /></label><small>At least 10 characters are required for a review action.</small></Card>}
    </div>
    <div className="privacy-list-heading"><div><p className="eyebrow">REQUEST HISTORY</p><h2>Recent requests</h2></div><span>{loading ? "Loading…" : `${rows.length} total`}</span></div>
    {loading ? <Card><SkeletonList rows={4} /></Card> : rows.length === 0 ? <Card className="privacy-empty"><FileText size={24} /><h3>No requests yet</h3><p>Submitted requests will appear here with their review status.</p></Card> : <div className="privacy-list">{rows.map((row) => <Card className="privacy-request" key={row.id}>
      <div className="privacy-request-top"><div><span className="privacy-type">{row.type === "ACCESS" ? "Data access" : "Deletion review"}</span><h3>{row.subjectName}</h3><p>{row.bookingPnr ? `PNR ${row.bookingPnr} · ` : ""}{row.contactEmail || row.contactPhone || "Account request"}</p></div><span className={`privacy-status privacy-status-${row.status.toLowerCase()}`}>{row.status.toLowerCase()}</span></div>
      {row.reason && <p className="privacy-request-reason">{row.reason}</p>}
      {row.reviewNote && <p className="privacy-request-note"><strong>Review note:</strong> {row.reviewNote}</p>}
      {canReview && (row.status === "PENDING" || row.status === "VERIFIED") && <div className="privacy-request-actions">
        {row.status === "PENDING" && <><Button disabled={busy !== null} loading={busy === `${row.id}:VERIFY`} loadingLabel="Verifying…" onClick={() => void review(row.id, "VERIFY")}>Verify identity</Button><Button variant="secondary" disabled={busy !== null} loading={busy === `${row.id}:REJECT`} loadingLabel="Rejecting…" onClick={() => void review(row.id, "REJECT")}>Reject</Button></>}
        {row.status === "VERIFIED" && <><Button variant="secondary" disabled={busy !== null} loading={busy === `${row.id}:EXPORT`} loadingLabel="Downloading…" onClick={() => void exportRequest(row.id)}><Download size={15} /> Download export</Button><Button disabled={busy !== null} loading={busy === `${row.id}:COMPLETE`} loadingLabel="Completing…" onClick={() => void review(row.id, "COMPLETE")}>Complete</Button><Button variant="secondary" disabled={busy !== null} loading={busy === `${row.id}:RETAIN`} loadingLabel="Saving…" onClick={() => void review(row.id, "RETAIN")}>Retain with reason</Button><Button variant="secondary" disabled={busy !== null} loading={busy === `${row.id}:REJECT`} loadingLabel="Rejecting…" onClick={() => void review(row.id, "REJECT")}>Reject</Button></>}
      </div>}
    </Card>)}</div>}
  </>;
}
