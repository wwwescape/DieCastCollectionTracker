import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

// Placeholder for now; the collection stats live on the Collection page.
export default function DashboardPage() {
  const { t } = useTranslation();
  return (
    <Typography variant="h4" component="h1">
      {t("dashboard.welcome")}
    </Typography>
  );
}
