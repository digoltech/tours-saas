import { cn } from "../lib/utils";

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton", className)} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return <div className="skeleton-list" role="status" aria-label="Loading content">
    {Array.from({ length: rows }, (_, index) => <div className="skeleton-list-row" key={index}>
      <Skeleton className="skeleton-avatar" />
      <div><Skeleton className="skeleton-line" /><Skeleton className="skeleton-line skeleton-line-short" /></div>
    </div>)}
  </div>;
}

export function DashboardSkeleton() {
  return <section className="dashboard-skeleton" role="status" aria-label="Loading dashboard" aria-busy="true">
    <Skeleton className="skeleton-title" />
    <div className="skeleton-metrics">{Array.from({ length: 3 }, (_, index) => <div className="skeleton-panel" key={index}><Skeleton className="skeleton-line skeleton-line-short" /><Skeleton className="skeleton-value" /><Skeleton className="skeleton-line" /></div>)}</div>
    <div className="skeleton-panel"><Skeleton className="skeleton-title" /><SkeletonList rows={4} /></div>
  </section>;
}
