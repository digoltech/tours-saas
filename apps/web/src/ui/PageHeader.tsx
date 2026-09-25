"use client";

import { cn } from "../lib/utils";
import { createContext, useContext, useEffect, type Dispatch, type ReactNode, type SetStateAction } from "react";

export type WorkspaceHeading = { title: string; description: string; action?: ReactNode };
export const WorkspaceHeadingContext = createContext<Dispatch<SetStateAction<WorkspaceHeading | null>> | null>(null);

function sameAction(left: ReactNode, right: ReactNode) {
  if (left === right) return true;
  try { return JSON.stringify(left) === JSON.stringify(right); }
  catch { return false; }
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const setWorkspaceHeading = useContext(WorkspaceHeadingContext);
  useEffect(() => {
    if (!setWorkspaceHeading) return;
    setWorkspaceHeading((current: WorkspaceHeading | null) => {
      const next = { title, description, action };
      return current?.title === title && current.description === description && sameAction(current.action, action) ? current : next;
    });
    return () => setWorkspaceHeading(null);
  }, [setWorkspaceHeading, title, description, action]);
  if (setWorkspaceHeading) return null;
  return (
    <div className={cn("page-header")}>
      <div>
        <h1>{title}</h1>
        <p className={cn("page-description")}>{description}</p>
      </div>
      {action}
    </div>
  );
}
