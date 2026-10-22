import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import CollectionSubNav from "../components/CollectionSubNav";
import { useSeriesOverview } from "../hooks/useLookups";
import { seriesPath, seriesSubtitle } from "../utils/series";
import { useTranslation } from "react-i18next";

// Collection → Series: one card per series and year, most items first. Opening one shows
// that year's vehicles and sets.
const SeriesListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: series, isLoading } = useSeriesOverview();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("seriesPage.title")}
      </Typography>
      <CollectionSubNav />
      {isLoading ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>
      ) : !series?.length ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("seriesPage.none")}</Paper>
      ) : (
        <Grid container spacing={2}>
          {series.map((item) => (
            <Grid key={`${item.id}-${item.year}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card sx={{ height: "100%", borderRadius: 2, border: 1, borderColor: "divider" }}>
                <CardActionArea
                  onClick={() => navigate(seriesPath(item))}
                  sx={{ height: "100%", p: 1.5 }}
                >
                  <Typography variant="subtitle1">{item.name}</Typography>
                  {item.manufacturerName || item.year ? (
                    <Typography variant="body2" color="text.secondary">
                      {seriesSubtitle(item)}
                    </Typography>
                  ) : null}
                  <Typography variant="body2" color="text.secondary">
                    {t("common.vehicleCount", { count: item.carCount })} ·{" "}
                    {t("common.setCount", { count: item.setCount })}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default SeriesListPage;
