"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/components/AuthProvider";
import { RecordFields, RecordPage, RecordSection } from "../../ui/RecordPage";
import { Badge } from "../../ui/Badge";
export function BulkRowPage({ id }: { id: string }) {
  const { user } = useAuth();
  const [preview, setPreview] = useState<{
    entity: string;
    row?: Record<string, string>;
    result?: { row: number; ok: boolean; message: string };
  } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(`bulk-preview:${user.id}`);
        if (!raw) return;
        const draft = JSON.parse(raw);
        setPreview({
          entity: draft.entity,
          row: draft.rows?.[Number(id) - 2],
          result: draft.result?.results.find(
            (item: { row: number }) => item.row === Number(id),
          ),
        });
      } catch {
        /* Show the empty preview message. */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, user?.id]);
  return (
    <RecordPage
      title={`CSV row ${id}`}
      description="Review uploaded values and their validation result."
      backHref="/dashboard/data"
      backLabel="Back to import"
    >
      {preview ? (
        <>
          <RecordSection title="Validation">
            <Badge>{preview.result?.ok ? "Valid" : "Error"}</Badge>
            <p>{preview.result?.message}</p>
          </RecordSection>
          <RecordSection title="Uploaded values">
            <RecordFields
              fields={Object.entries(preview.row ?? {}).map(
                ([label, value]) => ({ label, value }),
              )}
            />
          </RecordSection>
        </>
      ) : (
        <div className="state-message">
          Upload and validate a CSV file to open its row details.
        </div>
      )}
    </RecordPage>
  );
}
