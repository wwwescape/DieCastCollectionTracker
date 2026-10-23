import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import ListAltIcon from "@mui/icons-material/ListAlt";
import TuneIcon from "@mui/icons-material/Tune";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { ToolbarButton } from "./Page";

// Settings layout: titled groups of rows, each row a name and a short description on
// the left and its control on the right (stacked on phones).

interface SettingsGroupProps {
  title: string;
  lead?: string;
  children: ReactNode;
}

export const SettingsGroup = ({ title, lead, children }: SettingsGroupProps) => (
  <Box component="section" sx={{ mb: 2.5 }}>
    <Typography variant="h5" component="h2" sx={{ fontSize: 18 }}>
      {title}
    </Typography>
    {lead ? (
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
        {lead}
      </Typography>
    ) : null}
    <Box
      sx={{
        mt: 1.5,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 2.5,
        "& > * + *": { borderTop: 1, borderColor: "divider" },
      }}
    >
      {children}
    </Box>
  </Box>
);

interface SettingRowProps {
  // Leave out for a row that's only a wide control (the backup and share panels).
  name?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  // Wide controls (lists, upload areas) go under the name instead of beside it.
  stacked?: boolean;
}

export const SettingRow = ({ name, description, children, stacked = false }: SettingRowProps) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: stacked ? "1fr" : { xs: "1fr", md: "1fr minmax(240px, 380px)" },
      gap: { xs: 1.5, md: stacked ? 1.5 : 2.5 },
      alignItems: "center",
      px: { xs: 2, sm: 2.5 },
      py: 2,
    }}
  >
    {name ? (
      <Box>
        <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
        {description ? (
          <Typography variant="body2" component="div" sx={{ color: "dct.text3", mt: 0.375 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
    ) : null}
    {children ? (
      <Box
        sx={{
          minWidth: 0,
          justifySelf: stacked ? "stretch" : { xs: "start", md: "end" },
          width: stacked ? "100%" : undefined,
        }}
      >
        {children}
      </Box>
    ) : null}
  </Box>
);

// The Settings pages' shared toolbar: one button per sub-page, the current one highlighted.
export const SettingsToolbar = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <>
      <ToolbarButton
        icon={<TuneIcon />}
        label={t("settings.general")}
        to="/settings"
        active={pathname === "/settings"}
        aria-current={pathname === "/settings" ? "page" : undefined}
      />
      <ToolbarButton
        icon={<ListAltIcon />}
        label={t("nav.lookups")}
        to="/settings/lookups"
        active={pathname === "/settings/lookups"}
        aria-current={pathname === "/settings/lookups" ? "page" : undefined}
      />
    </>
  );
};
