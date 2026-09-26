"use client";

import { cn } from "./lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Search,
  BarChart3,
  Bell,
  Bus,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  ChevronsLeft,
  ChevronsRight,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Building2,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import {
  PageHeader,
  WorkspaceHeadingContext,
  type WorkspaceHeading,
} from "./ui/PageHeader";
import type { PageConfig } from "./page-config";
import { useAuth } from "./features/auth/components/AuthProvider";
import {
  getAgencySettings,
  getAgencies,
  getAgents,
  getBookings,
  getBranches,
  getBuses,
  getRoutes,
  getTrips,
} from "./features/auth/services/api-client";
import type { AgencyBranding } from "@a-one-tours/shared";
import type { AuthUser } from "./features/auth/types";

const navGroups = [
  {
    label: "",
    items: [
      { label: "Dashboard", path: "/dashboard/home", icon: LayoutDashboard },
      {
        label: "Bookings",
        path: "/dashboard/bookings",
        icon: ClipboardList,
        permission: "booking:read",
      },
      {
        label: "Trips",
        path: "/dashboard/trips",
        icon: CalendarDays,
        permission: "trip:read",
      },
      {
        label: "Buses",
        path: "/dashboard/buses",
        icon: Bus,
        permission: "bus:read",
      },
      {
        label: "Routes & Stops",
        path: "/dashboard/routes",
        icon: Map,
        permission: "route:read",
      },
      {
        label: "Operators",
        path: "/dashboard/operators",
        icon: Building2,
        permission: "bus:read",
      },
      {
        label: "Branches",
        path: "/dashboard/branches",
        icon: GitBranch,
        permission: "branch:read",
      },
      {
        label: "Agents",
        path: "/dashboard/agents",
        icon: Users,
        permission: "agent:read",
      },
      {
        label: "Finance",
        path: "/dashboard/finance",
        icon: CircleDollarSign,
        permission: "finance:read",
      },
      { label: "Notifications", path: "/dashboard/notifications", icon: Bell },
      { label: "Settings", path: "/dashboard/settings", icon: Settings },
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

type HeaderSearchItem = {
  id: string;
  title: string;
  detail: string;
  kind: string;
  href: string;
};

function HeaderSearch({ user }: { user: AuthUser | null }) {
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HeaderSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const normalized = query.trim();
  const can = useCallback(
    (permission: string) =>
      user?.role === "SUPER_ADMIN" || !!user?.permissions.includes(permission),
    [user],
  );

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !searchRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  useEffect(() => {
    if (normalized.length < 2) {
      const resetTimer = window.setTimeout(() => {
        setResults([]);
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const tasks: Promise<HeaderSearchItem[]>[] = [];
      if (can("trip:read"))
        tasks.push(
          getTrips({ search: normalized, limit: "5" }).then((page) =>
            page.data.map((trip) => ({
              id: trip.id,
              title: trip.tripCode,
              detail: `${trip.route.source} → ${trip.route.destination} · ${new Date(trip.travelDate).toLocaleDateString()}`,
              kind: "Trip",
              href: `/dashboard/trips/${trip.id}`,
            })),
          ),
        );
      if (can("bus:read"))
        tasks.push(
          getBuses({ search: normalized, limit: "5" }).then((page) =>
            page.data.map((bus) => ({
              id: bus.id,
              title: bus.busNumber,
              detail: `${bus.registrationNumber} · ${bus.operatorName || "No operator"}`,
              kind: "Bus",
              href: "/dashboard/buses",
            })),
          ),
        );
      if (can("route:read"))
        tasks.push(
          getRoutes({ search: normalized, limit: "5" }).then((page) =>
            page.data.map((route) => ({
              id: route.id,
              title: route.name,
              detail: `${route.source} → ${route.destination}`,
              kind: "Route",
              href: `/dashboard/routes/${route.id}`,
            })),
          ),
        );
      if (can("agency:read"))
        tasks.push(
          getAgencies(normalized).then((rows) =>
            (rows as { id: string; name: string }[])
              .slice(0, 5)
              .map((agency) => ({
                id: agency.id,
                title: agency.name,
                detail: "Agency workspace",
                kind: "Agency",
                href: "/dashboard/agencies",
              })),
          ),
        );
      if (user?.agencyId && can("branch:read"))
        tasks.push(
          getBranches(user.agencyId, normalized).then((rows) =>
            (rows as { id: string; name: string; code: string }[])
              .slice(0, 5)
              .map((branch) => ({
                id: branch.id,
                title: branch.name,
                detail: `Branch · ${branch.code}`,
                kind: "Branch",
                href: "/dashboard/branches",
              })),
          ),
        );
      if (user?.agencyId && can("agent:read"))
        tasks.push(
          getAgents(user.agencyId, normalized).then((rows) =>
            (
              rows as {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
              }[]
            )
              .slice(0, 5)
              .map((agent) => ({
                id: agent.id,
                title: `${agent.firstName} ${agent.lastName}`,
                detail: agent.email,
                kind: "Agent",
                href: "/dashboard/agents",
              })),
          ),
        );
      if (can("booking:read")) {
        tasks.push(
          getBookings({ pnr: normalized, limit: "5" }).then((page) =>
            page.data.map((booking) => ({
              id: booking.id,
              title: booking.pnr,
              detail: `${booking.trip.route.source} → ${booking.trip.route.destination} · ${moneySearch(booking.totalAmount)}`,
              kind: "Booking",
              href: "/dashboard/bookings",
            })),
          ),
        );
        tasks.push(
          getBookings({ tripCode: normalized, limit: "5" }).then((page) =>
            page.data.map((booking) => ({
              id: booking.id,
              title: booking.pnr,
              detail: `${booking.trip.tripCode} · ${booking.trip.route.name}`,
              kind: "Booking",
              href: "/dashboard/bookings",
            })),
          ),
        );
      }
      const values = await Promise.all(
        tasks.map((task) => task.catch(() => [] as HeaderSearchItem[])),
      );
      if (active) {
        setResults(values.flat().slice(0, 10));
        setLoading(false);
      }
    }, 280);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [normalized, user, can]);

  return (
    <div
      className={cn(`header-search ${open ? "search-open" : ""}`)}
      ref={searchRef}
    >
      <Search size={17} aria-hidden="true" />
      <input
        ref={inputRef}
        aria-label="Search workspace"
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        placeholder="Search bookings, trips, buses…"
      />
      {query ? (
        <button
          type="button"
          className={cn("header-search-clear")}
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            setResults([]);
            inputRef.current?.focus();
          }}
        >
          <X size={15} />
        </button>
      ) : (
        <kbd>Ctrl K</kbd>
      )}
      {open && normalized.length >= 2 && (
        <div
          className={cn("header-search-results")}
          role="region"
          aria-label="Search results"
        >
          <div className={cn("header-search-caption")}>
            {loading
              ? "Searching workspace…"
              : results.length
                ? `${results.length} matching records`
                : "No matching records"}
          </div>
          {results.map((item) => (
            <Link
              className={cn("header-search-result")}
              href={item.href}
              key={`${item.kind}-${item.id}`}
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
            >
              <span className={cn("header-search-kind")}>{item.kind}</span>
              <span className={cn("header-search-result-copy")}>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <ArrowRight size={15} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function moneySearch(value: number | string) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceHeading, setWorkspaceHeading] =
    useState<WorkspaceHeading | null>(null);
  const [agencyBranding, setAgencyBranding] = useState<AgencyBranding | null>(
    null,
  );
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  useEffect(() => {
    if (!user?.agencyId) {
      const timer = window.setTimeout(() => setAgencyBranding(null), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    getAgencySettings()
      .then((agency) => {
        if (active) setAgencyBranding(agency);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.agencyId]);
  const pageLabels: Record<string, string> = {
    dashboard: "Dashboard",
    home: "Home",
    superadmin: "Super Admin",
    bookings: "Bookings",
    finance: "Finance",
    reports: "Reports",
    operators: "Operators",
    notifications: "Notifications",
    agencies: "Agencies",
    branches: "Branches",
    agents: "Agents",
    buses: "Buses",
    drivers: "Drivers",
    routes: "Routes & Stops",
    trips: "Trips",
    "seat-layout": "Seat layouts",
    settings: "Settings",
    profile: "Profile",
  };
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbParts = pathParts.map((part, index) => ({
    href: `/${pathParts.slice(0, index + 1).join("/")}`,
    label:
      index === pathParts.length - 1 && workspaceHeading
        ? workspaceHeading.title
        : (pageLabels[part] ??
          (index === pathParts.length - 1 ? "Details" : part)),
    current: index === pathParts.length - 1,
  }));
  const dashboardPath =
    user?.role === "SUPER_ADMIN" ? "/dashboard/superadmin" : "/dashboard/home";
  return (
    <WorkspaceHeadingContext.Provider value={setWorkspaceHeading}>
      <div
        className={cn(
          `app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`,
        )}
      >
        <aside className={cn(`sidebar ${mobileOpen ? "sidebar-open" : ""}`)}>
          <div className={cn("brand")}>
            <div
              className={cn("brand-mark")}
              style={{ background: agencyBranding?.brandColor ?? undefined }}
            >
              {agencyBranding?.logoUrl ? (
                <Image
                  unoptimized
                  width={42}
                  height={42}
                  src={agencyBranding.logoUrl}
                  alt=""
                  className="h-full w-full rounded-xl object-contain"
                />
              ) : (
                "A"
              )}
            </div>
            <div>
              <strong>{agencyBranding?.name ?? "A-One"}</strong>
              <span>Tours & Travels</span>
            </div>
            <button
              className={cn("icon-button mobile-close")}
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className={cn("tenant-switcher")}>
            <div className={cn("tenant-avatar")}>
              {(agencyBranding?.name ?? "AT").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>
                {agencyBranding?.name ?? user?.agencyName ?? "A-One Tours"}
              </strong>
              <span>Organization</span>
            </div>
            <ChevronDown size={20} />
            <button
              className={cn("sidebar-collapse-toggle")}
              type="button"
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronsRight size={18} />
              ) : (
                <ChevronsLeft size={18} />
              )}
            </button>
          </div>
          <nav className={cn("navigation")} aria-label="Primary navigation">
            {navGroups.map((group) => (
              <div className={cn("nav-group")} key={group.label}>
                {group.label && (
                  <p className={cn("nav-label")}>{group.label}</p>
                )}
                {group.items
                  .filter(
                    (item) =>
                      !item.permission ||
                      user?.role === "SUPER_ADMIN" ||
                      user?.permissions.includes(item.permission),
                  )
                  .map((item) =>
                    (() => {
                      const destination =
                        item.label === "Dashboard" ? dashboardPath : item.path;
                      const active =
                        item.label === "Dashboard"
                          ? pathname === dashboardPath
                          : item.label === "Finance"
                            ? pathname === "/dashboard/finance"
                            : pathname === item.path ||
                              pathname.startsWith(`${item.path}/`);
                      return (
                        <Link
                          key={item.path}
                          onClick={() => setMobileOpen(false)}
                          href={destination}
                          className={cn(
                            `nav-item ${active ? "nav-item-active" : ""}`,
                          )}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <item.icon size={18} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })(),
                  )}
              </div>
            ))}
          </nav>
        </aside>
        {mobileOpen && (
          <button
            className={cn("mobile-backdrop")}
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <main className={cn("main-area")}>
          <header className={cn("topbar")}>
            <button
              className={cn("icon-button mobile-menu")}
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className={cn("topbar-page-meta")} aria-live="polite">
              <nav className={cn("breadcrumb")} aria-label="Breadcrumb">
                <Link href={dashboardPath}>Workspace</Link>
                {breadcrumbParts.map((part) => (
                  <span className={cn("breadcrumb-part")} key={part.href}>
                    <span aria-hidden="true">/</span>
                    {part.current ? (
                      <strong aria-current="page">{part.label}</strong>
                    ) : (
                      <Link href={part.href}>{part.label}</Link>
                    )}
                  </span>
                ))}
              </nav>
              {workspaceHeading?.description && (
                <p className={cn("topbar-subtitle")}>
                  {workspaceHeading.description}
                </p>
              )}
            </div>
            {workspaceHeading?.action && (
              <div className={cn("topbar-page-action")}>
                {workspaceHeading.action}
              </div>
            )}
            <div className={cn("topbar-actions")}>
              <HeaderSearch user={user} />
              <Link
                className={cn("icon-button notification-button")}
                href="/dashboard/notifications"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={19} />
              </Link>
              <details className={cn("profile-menu")}>
                <summary className={cn("profile profile-compact")}>
                  <span className={cn("profile-symbol")}>
                    <UserRound size={17} />
                  </span>
                  <div className={cn("profile-info")}>
                    <strong>
                      {status === "loading"
                        ? "Loading account..."
                        : user
                          ? `${user.firstName} ${user.lastName}`
                          : "Unauthenticated"}
                    </strong>
                    <span>
                      {user?.role
                        .replaceAll("_", " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (letter) => letter.toUpperCase()) ??
                        "Sign in required"}
                    </span>
                  </div>
                  <ChevronDown size={16} />
                </summary>
                {user && (
                  <div className={cn("profile-dropdown")}>
                    <div className={cn("profile-dropdown-identity")}>
                      <strong>
                        {user.firstName} {user.lastName}
                      </strong>
                      <span>{user.email}</span>
                      <span>{user.agencyName ?? "A-One Tours"}</span>
                    </div>
                    <Link href="/dashboard/profile">Profile</Link>
                    <Link href="/dashboard/settings">Settings</Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to log out?"))
                          void logout();
                      }}
                    >
                      <LogOut size={15} /> Log out
                    </button>
                  </div>
                )}
              </details>
            </div>
          </header>
          <div className={cn("content")}>{children}</div>
        </main>
      </div>
    </WorkspaceHeadingContext.Provider>
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
    <Card className={cn("metric-card")}>
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
    <div className={cn("setup-row")}>
      <span className={cn("step-number")}>{number}</span>
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
      />
      <div className={cn("notice")}>
        <div className={cn("notice-icon")}>
          <ShieldCheck size={19} />
        </div>
        <div>
          <strong>Your workspace is ready for setup</strong>
          <p>
            Start by defining your organization structure. Business modules will
            become available as your foundation grows.
          </p>
        </div>
        <button className={cn("notice-close")} aria-label="Dismiss notice">
          <X size={17} />
        </button>
      </div>
      <div className={cn("metric-grid")}>
        <Metric label="Agencies" value="0" detail="No agencies added" />
        <Metric label="Active branches" value="0" detail="Awaiting setup" />
        <Metric label="Fleet vehicles" value="0" detail="No vehicles added" />
        <Metric label="Upcoming trips" value="0" detail="No trips planned" />
      </div>
      <div className={cn("dashboard-grid")}>
        <Card className={cn("setup-card")}>
          <div className={cn("card-heading")}>
            <div>
              <p className={cn("eyebrow")}>Getting started</p>
              <h2>Build your operating foundation</h2>
            </div>
            <Badge>Phase 1</Badge>
          </div>
          <p className={cn("muted")}>
            A few essentials will unlock the rest of the A-One Tours workspace.
          </p>
          <div className={cn("setup-list")}>
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
        <Card className={cn("activity-card")}>
          <div className={cn("card-heading")}>
            <div>
              <p className={cn("eyebrow")}>System status</p>
              <h2>Platform health</h2>
            </div>
            <span className={cn("status-dot")}>
              <i />
              Operational
            </span>
          </div>
          <div className={cn("health-row")}>
            <span>API service</span>
            <strong>Ready</strong>
          </div>
          <div className={cn("health-row")}>
            <span>Database connection</span>
            <strong>Configuration pending</strong>
          </div>
          <div className={cn("health-row")}>
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
      <PageHeader title={config.title} description={config.description} />
      <Card className={cn("empty-state")}>
        <div className={cn("empty-icon")}>
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
    <div className={cn("login-page")}>
      <div className={cn("login-brand")}>
        <div className={cn("brand-mark")}>A</div>
        <strong>A-One Tours & Travels</strong>
      </div>
      <Card className={cn("login-card")}>
        <p className={cn("eyebrow")}>Welcome back</p>
        <h1>Sign in to your workspace</h1>
        <p className={cn("muted")}>
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
        <Button>
          Authentication coming soon <ArrowRight size={15} />
        </Button>
      </Card>
    </div>
  );
}
