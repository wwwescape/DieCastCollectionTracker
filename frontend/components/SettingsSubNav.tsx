import { Link, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { useTranslation } from "react-i18next";

const SUB_NAV_ITEMS = [
  { to: "/settings", labelKey: "nav.overview" },
  { to: "/settings/lookups", labelKey: "nav.lookups" },
] as const;

// Mirrors VideoGameTrackarr's SettingsSubNav — keeps Lookups reachable at every breakpoint,
// since NavDrawer's nested sub-items are desktop-only.
const SettingsSubNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Box
      component="nav"
      aria-label={t("settings.subNavLabel")}
      sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}
    >
      {SUB_NAV_ITEMS.map((item) => {
        const isSelected = location.pathname === item.to;
        return (
          <Chip
            key={item.to}
            component={Link}
            to={item.to}
            label={t(item.labelKey)}
            clickable
            aria-current={isSelected ? "page" : undefined}
            color={isSelected ? "primary" : "default"}
            variant={isSelected ? "filled" : "outlined"}
          />
        );
      })}
    </Box>
  );
};

export default SettingsSubNav;
