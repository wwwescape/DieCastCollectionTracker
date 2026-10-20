import { useNavigate, useParams } from "react-router-dom";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VehiclesAndSets from "../components/VehiclesAndSets";
import { useSeriesOverview } from "../hooks/useLookups";
import { useTranslation } from "react-i18next";

// Everything in one series: its vehicles, then its sets.
const SeriesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const seriesId = Number(id);
  const { data: allSeries, isLoading } = useSeriesOverview();
  const series = allSeries?.find((s) => s.id === seriesId);

  const back = (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/collection/series")}>
        {t("seriesPage.all")}
      </Button>
    </div>
  );

  if (isLoading) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>;
  }
  if (!series) {
    return (
      <Stack spacing={2}>
        {back}
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("seriesPage.notFound")}</Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {back}
      <div>
        <Typography variant="h4" component="h1">
          {series.name}
        </Typography>
        {series.manufacturerName ? (
          <Typography variant="subtitle1" color="text.secondary">
            {series.manufacturerName}
          </Typography>
        ) : null}
      </div>

      <VehiclesAndSets
        filter={{ seriesId }}
        noVehicles={t("seriesPage.noVehicles")}
        noSets={t("seriesPage.noSets")}
      />
    </Stack>
  );
};

export default SeriesPage;
