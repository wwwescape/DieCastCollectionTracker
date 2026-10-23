import { useLocation, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { ToolbarButton } from "./Page";

// Vehicles and Sets on the share-link pages, as header tabs.
const PublicSubNav = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const location = useLocation();

  const items = [
    { to: `/public/${token}/vehicles`, labelKey: "nav.vehicles" },
    { to: `/public/${token}/sets`, labelKey: "nav.sets" },
  ] as const;

  return (
    <Box component="nav" aria-label={t("public.subNavLabel")} sx={{ display: "flex", gap: 0.5 }}>
      {items.map((item) => {
        const isSelected = location.pathname === item.to;
        return (
          <ToolbarButton
            key={item.to}
            icon={null}
            label={t(item.labelKey)}
            to={item.to}
            active={isSelected}
            aria-current={isSelected ? "page" : undefined}
            sx={{ height: 34, flexDirection: "row", fontSize: 13 }}
          />
        );
      })}
    </Box>
  );
};

export default PublicSubNav;
