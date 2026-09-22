"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bus,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Map,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { PageHeader } from "./ui/PageHeader";
import type { PageConfig } from "./page-config";
import { useAuth } from "./features/auth/components/AuthProvider";

const navGroups = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
      {
        label: "Agencies",
        path: "/agencies",
        icon: ShieldCheck,
        permission: "agency:read",
      },
      {
        label: "Branches",
        path: "/branches",
        icon: Map,
        permission: "branch:read",
      },
      {
        label: "Agents",
        path: "/agents",
        icon: Users,
        permission: "agent:read",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Buses", path: "/buses", icon: Bus, permission: "bus:read" },
      {
        label: "Drivers",
        path: "/drivers",
        icon: UserRound,
        permission: "bus:read",
      },
      { label: "Routes", path: "/routes", icon: Map, permission: "route:read" },
      {
        label: "Trips",
        path: "/trips",
        icon: BarChart3,
        permission: "trip:read",
      },
    ],
  },
];
const pageIcons = {
  shield: ShieldCheck,
  map: Map,
  users: Users,
  bus: Bus,
  driver: UserRound,
  chart: BarChart3,
  settings: Settings,
};

export function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>A-One</strong>
            <span>Tours & Travels</span>
          </div>
          <button
            className="icon-button mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="tenant-switcher">
          <div className="tenant-avatar">AT</div>
          <div>
            <strong>A-One Tours</strong>
            <span>Organization</span>
          </div>
          <ChevronDown size={16} />
        </div>
        <nav className="navigation" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items
                .filter(
                  (item) =>
                    !item.permission ||
                    user?.role === "SUPER_ADMIN" ||
                    user?.permissions.includes(item.permission),
                )
                .map((item) => (
                  <Link
                    key={item.path}
                    onClick={() => setMobileOpen(false)}
                    href={item.path}
                    className={`nav-item ${pathname === item.path ? "nav-item-active" : ""}`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link
            href="/settings"
            className={`nav-item ${pathname === "/settings" ? "nav-item-active" : ""}`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
          <div className="help-box">
            <CircleHelp size={18} />
            <div>
              <strong>Need a hand?</strong>
              <span>Read the platform guide</span>
            </div>
            <ArrowRight size={16} />
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>Overview</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Help">
              <CircleHelp size={20} />
            </button>
            <div className="profile">
              <div className="profile-avatar">
                {user ? `${user.firstName[0]}${user.lastName[0]}` : ".."}
              </div>
              <div className="profile-info">
                <strong>
                  {status === "loading"
                    ? "Loading account..."
                    : user
                      ? `${user.firstName} ${user.lastName}`
                      : "Unauthenticated"}
                </strong>
                <span>{user?.email ?? "Sign in required"}</span>
              </div>
              <ChevronDown size={16} />
            </div>
            {user && (
              <button
                className="button button-ghost profile-logout"
                type="button"
                onClick={logout}
              >
                Log out
              </button>
            )}
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </Card>
  );
}
function SetupRow({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="setup-row">
      <span className="step-number">{number}</span>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <ArrowRight size={17} />
    </div>
  );
}
export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Good morning, Admin"
        description="Here is what is happening across your travel operations today."
        action={
          <Button>
            Set up workspace <ArrowRight size={16} />
          </Button>
        }
      />
      <div className="notice">
        <div className="notice-icon">
          <ShieldCheck size={19} />
        </div>
        <div>
          <strong>Your workspace is ready for setup</strong>
          <p>
            Start by defining your organization structure. Business modules will
            become available as your foundation grows.
          </p>
        </div>
        <button className="notice-close" aria-label="Dismiss notice">
          <X size={17} />
        </button>
      </div>
      <div className="metric-grid">
        <Metric label="Agencies" value="0" detail="No agencies added" />
        <Metric label="Active branches" value="0" detail="Awaiting setup" />
        <Metric label="Fleet vehicles" value="0" detail="No vehicles added" />
        <Metric label="Upcoming trips" value="0" detail="No trips planned" />
      </div>
      <div className="dashboard-grid">
        <Card className="setup-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Getting started</p>
              <h2>Build your operating foundation</h2>
            </div>
            <Badge>Phase 1</Badge>
          </div>
          <p className="muted">
            A few essentials will unlock the rest of the A-One Tours workspace.
          </p>
          <div className="setup-list">
            <SetupRow
              number="01"
              title="Define your organization"
              detail="Add your agency and branches"
            />
            <SetupRow
              number="02"
              title="Configure your team"
              detail="Invite agents and assign roles"
            />
            <SetupRow
              number="03"
              title="Add your fleet"
              detail="Register buses and drivers"
            />
          </div>
        </Card>
        <Card className="activity-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">System status</p>
              <h2>Platform health</h2>
            </div>
            <span className="status-dot">
              <i />
              Operational
            </span>
          </div>
          <div className="health-row">
            <span>API service</span>
            <strong>Ready</strong>
          </div>
          <div className="health-row">
            <span>Database connection</span>
            <strong>Configuration pending</strong>
          </div>
          <div className="health-row">
            <span>Authentication</span>
            <strong>Coming in next phase</strong>
          </div>
        </Card>
      </div>
    </>
  );
}
export function PlaceholderPage({ config }: { config: PageConfig }) {
  const Icon = pageIcons[config.icon];
  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        action={<Button variant="secondary">Coming soon</Button>}
      />
      <Card className="empty-state">
        <div className="empty-icon">
          <Icon size={25} />
        </div>
        <h2>{config.title} workspace</h2>
        <p>
          This module is intentionally reserved for a later implementation
          phase. The route and shell are ready for it.
        </p>
        <Badge>Foundation only</Badge>
      </Card>
    </>
  );
}
export function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="brand-mark">A</div>
        <strong>A-One Tours & Travels</strong>
      </div>
      <Card className="login-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to your workspace</h1>
        <p className="muted">
          Authentication will be enabled in a later phase.
        </p>
        <label>
          Email address
          <input type="email" placeholder="you@company.com" disabled />
        </label>
        <label>
          Password
          <input type="password" placeholder="Your password" disabled />
        </label>
        <Button>Authentication coming soon</Button>
      </Card>
    </div>
  );
}
