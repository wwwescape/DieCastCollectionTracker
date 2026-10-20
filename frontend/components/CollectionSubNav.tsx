import { Link, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { isPathWithin } from "../navigation/destinations";
import { useTranslation } from "react-i18next";

const SUB_NAV_ITEMS = [
  { to: "/collection", labelKey: "nav.overview", exact: true },
  { to: "/collection/cars", labelKey: "nav.cars", exact: false },
  { to: "/collection/sets", labelKey: "nav.sets", exact: false },
  { to: "/collection/manufacturers", labelKey: "nav.manufacturers", exact: false },
] as const;

// Mirrors VideoGameTrackarr's GamesSubNav/HardwareSubNav — keeps Cars, Sets and Manufacturers reachable at
// every breakpoint, since NavDrawer's nested sub-items are desktop-only.
const CollectionSubNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Box
      component="nav"
      aria-label={t("collection.subNavLabel")}
      sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}
    >
      {SUB_NAV_ITEMS.map((item) => {
        const isSelected = item.exact
          ? location.pathname === item.to
          : isPathWithin(location.pathname, item.to);
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

export default CollectionSubNav;
