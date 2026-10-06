"use client";
import { LocalizedValue } from "./i18n/LocalizedValue";
import { localizeText } from "./i18n/errors";
import { getFormattingLocale } from "./i18n/format-client";
import { Translate } from "./i18n/Translate";

import { cn } from "./lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Brand } from "./ui/Brand";
import { LanguageSelector } from "./i18n/LanguageSelector";
import { useTranslations } from "./i18n/LocaleProvider";
import { Button } from "./ui/Button";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowRight,
  Search,
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
  FileSpreadsheet,
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
import {
  WorkspaceHeadingContext,
  type WorkspaceHeading,
} from "./ui/PageHeader";
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
      { label: "Roles & permissions", path: "/dashboard/roles", icon: ShieldCheck, permission: "agency:read", adminOnly: true },
      { label: "Agency activity", path: "/dashboard/activity", icon: Activity, permission: "agency:read" },
      { label: "Bulk data", path: "/dashboard/data", icon: FileSpreadsheet, permission: "bus:read" },
      { label: "Privacy requests", path: "/dashboard/privacy", icon: ShieldCheck },
      {
        label: "Finance",
        path: "/dashboard/finance",
        icon: CircleDollarSign,
        permission: "finance:read",
      },
    ],
  },
];
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
              detail: `${trip.route.source} → ${trip.route.destination} · ${new Date(trip.travelDate).toLocaleDateString(getFormattingLocale())}`,
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
                detail: "Agency",
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
        aria-label="Search records"
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
        <kbd><Translate text={"Ctrl K"} /></kbd>
      )}
      {open && normalized.length >= 2 && (
        <div
          className={cn("header-search-results")}
          role="region"
          aria-label="Search results"
        >
          <div className={cn("header-search-caption")}>
            <LocalizedValue value={loading
              ? "Searching records…"
              : results.length
                ? `${results.length} matching records`
                : "No matching records"} />
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
  return `₹${Number(value).toLocaleString(getFormattingLocale(), { maximumFractionDigits: 2 })}`;
}

export function Shell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
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
    roles: "Roles & permissions",
    activity: "Agency activity",
    data: "Bulk data",
  };
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbParts = pathParts.map((part, index) => ({
    href: `/${pathParts.slice(0, index + 1).join("/")}`,
    label:
      index === pathParts.length - 1 && workspaceHeading
        ? workspaceHeading.title
        : t(pageLabels[part] ??
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
            <Brand className="sidebar-digol-brand" />
            <button
              className={cn("icon-button mobile-close")}
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className={cn("tenant-switcher")}>
            <div>
              <strong>
                {agencyBranding?.name ?? user?.agencyName ?? "Digol Tours"}
              </strong>
              <span>{t("Organization")}</span>
            </div>
            <ChevronDown size={24} />
            <button
              className={cn("sidebar-collapse-toggle")}
              type="button"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
                  <p className={cn("nav-label")}>{t(group.label)}</p>
                )}
                {group.items
                  .filter(
                    (item) =>
                      !item.permission ||
                      user?.role === "SUPER_ADMIN" ||
                      (item.label === "Bulk data" && ["bus:read", "driver:read", "route:read", "stop:read"].some((permission) => user?.permissions.includes(permission))) ||
                      (user?.permissions.includes(item.permission) &&
                        (!item.adminOnly || user?.role === "AGENCY_ADMIN")),
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
                          title={sidebarCollapsed ? t(item.label) : undefined}
                        >
                          <item.icon size={18} />
                          <span>{t(item.label)}</span>
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
                <Link href={dashboardPath}>{t("Home")}</Link>
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
              <LanguageSelector />
              <HeaderSearch user={user} />
              <Link
                className={cn("icon-button notification-button")}
                href="/dashboard/notifications"
                aria-label={t("Notifications")}
                title={t("Notifications")}
              >
                <Bell size={19} />
              </Link>
              <Link
                className={cn("icon-button")}
                href="/dashboard/settings"
                aria-label={t("Settings")}
                title={t("Settings")}
              >
                <Settings size={19} />
              </Link>
              <details className={cn("profile-menu")}>
                <summary className={cn("profile profile-compact")}>
                  <span className={cn("profile-symbol")}>
                    <UserRound size={17} />
                  </span>
                  <div className={cn("profile-info")}>
                    <strong>
                      {status === "loading"
                        ? t("Loading account...")
                        : user
                          ? `${user.firstName} ${user.lastName}`
                          : t("Unauthenticated")}
                    </strong>
                    <span>
                      {user?.roleName ?? (user?.role
                        .replaceAll("_", " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (letter) => letter.toUpperCase()) ??
                        t("Sign in required"))}
                    </span>
                  </div>
                  <ChevronDown size={16} />
                </summary>
                {user && (
                  <div className={cn("profile-dropdown")}>
                    <div className={cn("profile-dropdown-identity")}>
                      <span className="profile-dropdown-avatar" aria-hidden="true">{user.firstName?.[0]}{user.lastName?.[0]}</span>
                      <span className="profile-dropdown-eyebrow"><Translate text={"Signed in as"} /></span>
                      <strong>
                        {user.firstName} {user.lastName}
                      </strong>
                      <span>{user.email}</span>
                      <span>{user.agencyName ?? "Digol Tours"}</span>
                    </div>
                    <Link href="/dashboard/profile"><UserRound size={16} /> {t("My profile")}</Link>
                    <Link href="/dashboard/settings"><Settings size={16} /> {t("Settings")}</Link>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoutError("");
                        setLogoutOpen(true);
                      }}
                    >
                      <LogOut size={15} /> {t("Log out")}
                    </button>
                  </div>
                )}
              </details>
            </div>
          </header>
          {logoutOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !loggingOut) setLogoutOpen(false); }}>
            <div className="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description" onKeyDown={(event) => {
              if (event.key === "Escape" && !loggingOut) setLogoutOpen(false);
              if (event.key === "Tab") {
                const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
              }
            }}>
              <div className="logout-dialog-icon"><LogOut size={23} /></div>
              <h2 id="logout-title"><Translate text={"Log out of your account?"} /></h2>
              <p id="logout-description"><Translate text={"You’ll need to sign in again to access your workspace."} /></p>
              {logoutError && <p className="form-error" role="alert">{logoutError}</p>}
              <div className="logout-dialog-actions">
                <Button variant="secondary" onClick={() => setLogoutOpen(false)} disabled={loggingOut} autoFocus><Translate text={"Stay signed in"} /></Button>
                <Button variant="destructive" loading={loggingOut} loadingLabel="Logging out…" onClick={async () => { setLoggingOut(true); setLogoutError(""); try { await logout(); } catch (error) { setLogoutError(error instanceof Error ? error.message : localizeText("Unable to log out. Please try again.")); setLoggingOut(false); } }}><LogOut size={16} /> <Translate text={"Log out"} /></Button>
              </div>
            </div>
          </div>}
          <div className={cn("content")}>{children}</div>
          <footer className="dashboard-footer"><span>© {new Date().getFullYear()} Digol Tours · Digol TravelOS</span><nav aria-label="Support and legal"><Link href="/contact"><Translate text={"Contact"} /></Link><Link href="/privacy-policy"><Translate text={"Privacy Policy"} /></Link><Link href="/terms-and-conditions"><Translate text={"Terms"} /></Link></nav></footer>
        </main>
      </div>
    </WorkspaceHeadingContext.Provider>
  );
}
