import type { ReactNode } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import FactoryIcon from "@mui/icons-material/Factory";
import GarageIcon from "@mui/icons-material/Garage";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import RoadIcon from "../icons/RoadIcon";

export interface NavSubDestination {
  to: string;
  // A key in locales/*/translation.json — translated where the nav renders.
  labelKey: string;
  icon: ReactNode;
}

export interface NavDestination {
  to: string;
  labelKey: string;
  icon: ReactNode;
  // Desktop-drawer-only — see NavDrawer.tsx. Smaller breakpoints rely on the section's own
  // in-page sub-nav (CollectionSubNav.tsx, SettingsSubNav.tsx) instead.
  subItems?: NavSubDestination[];
}

// Single source of truth for the app's top-level destinations — shared by all three
// responsive nav patterns (bottom bar / rail / drawer) so they can never drift apart.
export const navDestinations: NavDestination[] = [
  { to: "/", labelKey: "nav.dashboard", icon: <DashboardIcon /> },
  {
    to: "/collection",
    labelKey: "nav.collection",
    icon: <GarageIcon />,
    subItems: [
      { to: "/collection/cars", labelKey: "nav.cars", icon: <DirectionsCarIcon /> },
      { to: "/collection/sets", labelKey: "nav.sets", icon: <RoadIcon /> },
      { to: "/collection/manufacturers", labelKey: "nav.manufacturers", icon: <FactoryIcon /> },
    ],
  },
  {
    to: "/settings",
    labelKey: "nav.settings",
    icon: <SettingsIcon />,
    subItems: [{ to: "/settings/lookups", labelKey: "nav.lookups", icon: <ListAltIcon /> }],
  },
];

// Prefix match, so a page nested under a destination (an edit page, an add flow) still
// highlights it. "/" is exact, or it would match everything.
export function isPathWithin(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function activeDestination(pathname: string): NavDestination | undefined {
  return navDestinations.find((destination) => isPathWithin(pathname, destination.to));
}
