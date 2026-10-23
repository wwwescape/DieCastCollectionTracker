import { Outlet } from "react-router-dom";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import PublicSubNav from "./components/PublicSubNav";
import { HEADER_HEIGHT } from "./navigation/Sidebar";
import { useColorMode } from "./theme/ColorModeProvider";
import { useTranslation } from "react-i18next";

// The share-link pages. Deliberately minimal, not a stripped-down AppShell: one slim header
// with Vehicles and Sets, no sidebar, no logout (there's no login here), no offline chrome.
const PublicShell = () => {
  const { t } = useTranslation();
  const { mode, toggleColorMode } = useColorMode();
  const themeLabel = mode === "dark" ? t("appShell.lightMode") : t("appShell.darkMode");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          height: HEADER_HEIGHT,
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, sm: 2 },
          px: { xs: 1.5, sm: 2.5 },
          bgcolor: "dct.shell",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          component="img"
          src="/DieCastCollectionTracker.svg"
          alt=""
          sx={{ width: 30, height: 30 }}
        />
        <Typography
          variant="subtitle2"
          noWrap
          sx={{ display: { xs: "none", sm: "block" }, fontWeight: 650 }}
        >
          DieCastCollectionTracker
        </Typography>
        <PublicSubNav />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={themeLabel}>
          <IconButton onClick={toggleColorMode} aria-label={themeLabel}>
            {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, px: { xs: 1.5, sm: 2.75 }, py: { xs: 1.75, sm: 2.25 } }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default PublicShell;
