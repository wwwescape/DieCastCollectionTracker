import type { ReactNode } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TuneIcon from "@mui/icons-material/Tune";

export interface NavDestination {
  to: string;
  label: string;
  icon: ReactNode;
}

// Single source of truth for the app's top-level destinations — shared by all three
// responsive nav patterns (bottom bar / rail / drawer) so they can never drift apart.
export const navDestinations: NavDestination[] = [
  { to: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { to: "/", label: "Collection", icon: <DirectionsCarIcon /> },
  { to: "/manage", label: "Manage", icon: <TuneIcon /> },
];
