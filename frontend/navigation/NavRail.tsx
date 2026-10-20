import { Link, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import { isPathWithin, navDestinations } from "./destinations";
import { useTranslation } from "react-i18next";

export const NAV_RAIL_WIDTH = 80;

const APP_BAR_HEIGHT = 64;

const NavRail = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: NAV_RAIL_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: NAV_RAIL_WIDTH,
          boxSizing: "border-box",
          border: "none",
          top: APP_BAR_HEIGHT,
          height: `calc(100% - ${APP_BAR_HEIGHT}px)`,
        },
      }}
    >
      <Box
        component="nav"
        aria-label={t("nav.primary")}
        sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, pt: 2 }}
      >
        {navDestinations.map((destination) => {
          const isSelected = isPathWithin(location.pathname, destination.to);
          return (
            <Box
              key={destination.to}
              component={Link}
              to={destination.to}
              aria-current={isSelected ? "page" : undefined}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                textDecoration: "none",
                color: isSelected ? "primary.main" : "text.secondary",
                width: 56,
                py: 0.5,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 32,
                  borderRadius: 999,
                  bgcolor: isSelected ? "action.selected" : "transparent",
                }}
              >
                {destination.icon}
              </Box>
              <Typography variant="caption" sx={{ fontSize: "0.6875rem" }}>
                {t(destination.labelKey)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Drawer>
  );
};

export default NavRail;
