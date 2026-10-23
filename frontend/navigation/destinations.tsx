import type { ReactNode } from "react";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import FactoryIcon from "@mui/icons-material/Factory";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import InsightsIcon from "@mui/icons-material/Insights";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import RoadIcon from "../icons/RoadIcon";

export interface NavSubDestination {
  to: string;
  // A key in locales/*/translation.json — translated where the nav renders.
  labelKey: string;
  icon?: ReactNode;
}

export interface NavDestination {
  to: string;
  labelKey: string;
  icon: ReactNode;
  // Shown under the destination while you're inside it, e.g. Vehicles → Add Vehicle.
  subItems?: NavSubDestination[];
  // Which collection count the sidebar shows beside it.
  count?: "vehicles" | "sets";
}

export interface NavGroup {
  labelKey: string;
  items: NavDestination[];
}

// Single source of truth for the sidebar (permanent on desktop, a drawer on phones).
export const navGroups: NavGroup[] = [
  {
    labelKey: "nav.groups.collection",
    items: [
      { to: "/", labelKey: "nav.overview", icon: <DashboardIcon /> },
      {
        to: "/collection/vehicles",
        labelKey: "nav.vehicles",
        icon: <DirectionsCarIcon />,
        count: "vehicles",
        subItems: [
          {
            to: "/collection/vehicles/add",
            labelKey: "nav.addVehicle",
            icon: <AddCircleOutlineIcon />,
          },
        ],
      },
      {
        to: "/collection/sets",
        labelKey: "nav.sets",
        icon: <RoadIcon />,
        count: "sets",
        subItems: [
          { to: "/collection/sets/add", labelKey: "nav.addSet", icon: <AddCircleOutlineIcon /> },
        ],
      },
      { to: "/collection/series", labelKey: "nav.series", icon: <CollectionsBookmarkIcon /> },
      { to: "/collection/manufacturers", labelKey: "nav.manufacturers", icon: <FactoryIcon /> },
    ],
  },
  {
    labelKey: "nav.groups.insights",
    items: [{ to: "/insights", labelKey: "nav.insights", icon: <InsightsIcon /> }],
  },
  {
    labelKey: "nav.groups.system",
    items: [
      {
        to: "/settings",
        labelKey: "nav.settings",
        icon: <SettingsIcon />,
        subItems: [{ to: "/settings/lookups", labelKey: "nav.lookups", icon: <ListAltIcon /> }],
      },
      { to: "/about", labelKey: "nav.about", icon: <InfoIcon /> },
    ],
  },
];

export const navDestinations: NavDestination[] = navGroups.flatMap((group) => group.items);

// Prefix match, so a page nested under a destination (an edit page, an add flow) still
// highlights it. "/" is exact, or it would match everything.
export function isPathWithin(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function activeDestination(pathname: string): NavDestination | undefined {
  return navDestinations.find((destination) => isPathWithin(pathname, destination.to));
}
