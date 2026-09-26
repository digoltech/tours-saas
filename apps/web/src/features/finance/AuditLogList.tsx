"use client";

import { useEffect, useState } from "react";
import { Card } from "../../ui/Card";
import { getAuditLogs } from "../auth/services/api-client";

export function AuditLogList() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getAuditLogs>>>(
    [],
  );
  const [error, setError] = useState("");
  useEffect(() => {
    getAuditLogs()
      .then(setRows)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load audit history",
        ),
      );
  }, []);
  return (
    <section className="mt-5">
      <div className="card-heading">
        <div>
          <p className="eyebrow">WORKSPACE HISTORY</p>
          <h2>Audit log</h2>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {rows.length ? (
        <div className="grid gap-2">
          {rows.slice(0, 30).map((row) => (
            <Card key={row.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{row.action.replaceAll("_", " ")}</strong>
                <span className="muted">
                  {new Date(row.createdAt).toLocaleString()}
                </span>
              </div>
              <p>
                {row.entityType}
                {row.entityId ? ` · ${row.entityId}` : ""} ·{" "}
                {row.actor
                  ? `${row.actor.firstName} ${row.actor.lastName}`
                  : "System"}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <Card>No audit activity yet.</Card>
      )}
    </section>
  );
}
