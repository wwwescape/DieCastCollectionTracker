import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VehiclesAndSets from "../components/VehiclesAndSets";
import { useSeriesOverview } from "../hooks/useLookups";
import { useTranslation } from "react-i18next";
import { seriesSubtitle } from "../utils/series";

// Everything in one year of a series: its vehicles, then its sets. Without ?year (a link from
// before series were split by year) it shows every year.
const SeriesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const seriesId = Number(id);
  const yearParam = searchParams.get("year");
  const year = yearParam === null ? undefined : yearParam === "none" ? null : Number(yearParam);
  const { data: allSeries, isLoading } = useSeriesOverview();
  const series = allSeries?.find(
    (s) => s.id === seriesId && (year === undefined || s.year === year)
  );

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
        {series.manufacturerName || year ? (
          <Typography variant="subtitle1" color="text.secondary">
            {seriesSubtitle({ manufacturerName: series.manufacturerName, year: year ?? null })}
          </Typography>
        ) : null}
      </div>

      <VehiclesAndSets
        filter={{ seriesId }}
        year={year}
        noVehicles={t("seriesPage.noVehicles")}
        noSets={t("seriesPage.noSets")}
      />
    </Stack>
  );
};

export default SeriesPage;
