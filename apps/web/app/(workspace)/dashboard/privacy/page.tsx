"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../../../src/features/auth/components/AuthProvider";
import { downloadPrivacyExport, getPrivacyRequests, reviewPrivacyRequest, submitStaffPrivacyRequest, type PrivacyRequestRecord } from "../../../../src/features/auth/services/api-client";
import { Card } from "../../../../src/ui/Card";
import { Button } from "../../../../src/ui/Button";
import { PageHeader } from "../../../../src/ui/PageHeader";

export default function PrivacyWorkspacePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PrivacyRequestRecord[]>([]);
  const [type, setType] = useState<"ACCESS" | "ERASURE">("ACCESS");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canReview = user?.role === "SUPER_ADMIN" || user?.role === "AGENCY_ADMIN";
  const load = useCallback(async () => {
    try { setRows(await getPrivacyRequests()); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load requests"); }
  }, []);
  useEffect(() => {
    let active = true;
    getPrivacyRequests().then((result) => { if (active) setRows(result); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Unable to load requests"); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await submitStaffPrivacyRequest({ type, reason }); setReason(""); await load(); setMessage("Request submitted."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit request"); }
    finally { setBusy(false); }
  }

  async function review(id: string, action: "VERIFY" | "REJECT" | "RETAIN" | "COMPLETE") {
    if (note.trim().length < 10) { setMessage("Enter a review note of at least 10 characters."); return; }
    setBusy(true); setMessage("");
    try { await reviewPrivacyRequest(id, action, note.trim()); await load(); setMessage("Review saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to review request"); }
    finally { setBusy(false); }
  }

  return <><PageHeader title="Privacy requests" description="Request your data or review verified passenger and staff requests." />
    <Card><h2>Request your account data</h2><form onSubmit={submit}>
      <label>Request type<select value={type} onChange={(event) => setType(event.target.value as "ACCESS" | "ERASURE")}><option value="ACCESS">Access</option><option value="ERASURE">Deletion review</option></select></label>
      <label>Details<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} /></label>
      <Button type="submit" disabled={busy}>Submit request</Button>
    </form></Card>
    {message && <p role="status">{message}</p>}
    {canReview && <Card><h2>Review note</h2><p>Confirm identity outside this page before selecting Verify. Never release an export to an unverified person.</p><textarea aria-label="Review note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} /></Card>}
    <div className="grid gap-3 mt-5">{rows.map((row) => <Card key={row.id}>
      <h3>{row.type} · {row.status}</h3><p>{row.subjectName} {row.bookingPnr ? `· PNR ${row.bookingPnr}` : ""}</p>
      <p>{row.contactEmail || row.contactPhone || "Account request"}</p><p>{row.reason}</p>
      {row.reviewNote && <p>Review: {row.reviewNote}</p>}
      {canReview && <div className="flex flex-wrap gap-2">
        {row.status === "PENDING" && <><Button type="button" disabled={busy} onClick={() => review(row.id, "VERIFY")}>Verify identity</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => review(row.id, "REJECT")}>Reject</Button></>}
        {row.status === "VERIFIED" && <><Button type="button" variant="secondary" disabled={busy} onClick={() => void downloadPrivacyExport(row.id).catch((error) => setMessage(error instanceof Error ? error.message : "Export failed"))}>Download export</Button><Button type="button" disabled={busy} onClick={() => review(row.id, "COMPLETE")}>Complete</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => review(row.id, "RETAIN")}>Retain with reason</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => review(row.id, "REJECT")}>Reject</Button></>}
      </div>}
    </Card>)}</div>
  </>;
}
