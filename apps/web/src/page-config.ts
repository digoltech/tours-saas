export type PageIcon =
  "shield" | "map" | "users" | "bus" | "driver" | "chart" | "settings";

export type PageConfig = {
  title: string;
  description: string;
  icon: PageIcon;
};

export const pageConfigs: Record<string, PageConfig> = {
  "/agencies": {
    title: "Agencies",
    description: "Tenant workspaces will live here.",
    icon: "shield",
  },
  "/branches": {
    title: "Branches",
    description: "Branch operations will be configured here.",
    icon: "map",
  },
  "/agents": {
    title: "Agents",
    description: "Agent access and assignments will be managed here.",
    icon: "users",
  },
  "/buses": {
    title: "Buses",
    description: "Fleet records will be managed here.",
    icon: "bus",
  },
  "/drivers": {
    title: "Drivers",
    description: "Driver records will be managed here.",
    icon: "driver",
  },
  "/routes": {
    title: "Routes",
    description: "Route planning will be configured here.",
    icon: "map",
  },
  "/trips": {
    title: "Trips",
    description: "Trip operations will be planned here.",
    icon: "chart",
  },
  "/settings": {
    title: "Settings",
    description: "Workspace preferences will be configured here.",
    icon: "settings",
  },
};
