import { Link, useLocation, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { useTranslation } from "react-i18next";

// Mirrors CollectionSubNav's chip row — just Cars and Sets on the share-link pages.
const PublicSubNav = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const location = useLocation();

  const items = [
    { to: `/public/${token}/cars`, labelKey: "nav.cars" },
    { to: `/public/${token}/sets`, labelKey: "nav.sets" },
  ] as const;

  return (
    <Box
      component="nav"
      aria-label={t("public.subNavLabel")}
      sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}
    >
      {items.map((item) => {
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

export default PublicSubNav;
