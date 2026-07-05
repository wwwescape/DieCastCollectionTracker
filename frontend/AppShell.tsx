import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LogoutIcon from "@mui/icons-material/Logout";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Switch from "@mui/material/Switch";
import { useTheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import OfflineStatusIndicator from "./components/OfflineStatusIndicator";
import { useLogout } from "./hooks/useAuth";
import BottomNavBar, { BOTTOM_NAV_HEIGHT } from "./navigation/BottomNavBar";
import NavDrawer, { NAV_DRAWER_WIDTH } from "./navigation/NavDrawer";
import NavRail, { NAV_RAIL_WIDTH } from "./navigation/NavRail";
import { useColorMode } from "./theme/ColorModeProvider";

// M3's three responsive navigation patterns: Navigation Bar (compact/mobile, bottom),
// Navigation Rail (medium/tablet, icons+labels side rail), Navigation Drawer
// (expanded/desktop, icons+labels side panel) — picked by breakpoint, not a user toggle.
const AppShell = () => {
  const { mode, toggleColorMode } = useColorMode();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("sm"));
  const isExpanded = useMediaQuery(theme.breakpoints.up("lg"));
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    // Clearing tokens/cache alone doesn't move the user off the current (now-stale)
    // protected page — ProtectedLayout only re-checks auth on navigation, and nothing
    // here triggers one without this explicit redirect.
    logoutMutation.mutate(undefined, { onSuccess: () => navigate("/login") });
  };

  const sideNavWidth = isCompact ? 0 : isExpanded ? NAV_DRAWER_WIDTH : NAV_RAIL_WIDTH;

  return (
    <Box sx={{ display: "flex" }}>
      <Link
        href="#main-content"
        sx={{
          position: "absolute",
          left: -9999,
          top: "auto",
          "&:focus": {
            position: "fixed",
            left: 8,
            top: 8,
            zIndex: (t) => t.zIndex.tooltip,
            p: 1.5,
            bgcolor: "background.paper",
            borderRadius: 1,
          },
        }}
      >
        Skip to main content
      </Link>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Box
            component="img"
            src="/DieCastCollectionTracker.png"
            alt=""
            sx={{ height: 64, width: 64, mr: 1.5 }}
          />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            noWrap
            sx={{ minWidth: 0, flexGrow: 1, color: "inherit", textDecoration: "none" }}
          >
            DieCastCollectionTracker
          </Typography>
          <OfflineStatusIndicator />
          <FormControlLabel
            control={<Switch checked={mode === "dark"} onChange={toggleColorMode} />}
            label="Dark Mode"
            sx={{
              mr: 1,
              ".MuiFormControlLabel-label": { display: { xs: "none", sm: "block" } },
            }}
          />
          <IconButton color="inherit" onClick={handleLogout} title="Log out" aria-label="Log out">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {isCompact ? null : isExpanded ? <NavDrawer /> : <NavRail />}

      <Box
        component="main"
        id="main-content"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { sm: `calc(100% - ${sideNavWidth}px)` },
          p: { xs: 1.5, sm: 2, md: 3 },
          pb: isCompact ? `${BOTTOM_NAV_HEIGHT + 24}px` : undefined,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {isCompact ? <BottomNavBar /> : null}
      <ToastContainer theme="colored" />
    </Box>
  );
};

export default AppShell;
