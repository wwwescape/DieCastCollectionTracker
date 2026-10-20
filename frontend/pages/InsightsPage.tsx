import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid2";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { DashboardStats } from "../api/dashboard";
import { useDashboard } from "../hooks/useDashboard";
import { useCurrency } from "../theme/CurrencyProvider";
import { formatCurrency } from "../utils/currency";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ textAlign: "center" }}>
        <Typography variant="h3" component="div" fontWeight="bold">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

// Insights: counts, value and breakdowns for the whole collection, vehicles and sets together.
export default function InsightsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useDashboard();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("insights.title")}
      </Typography>
      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={8}>
          <CircularProgress />
        </Box>
      ) : data ? (
        <CollectionStats data={data} />
      ) : null}
    </Box>
  );
}

function CollectionStats({ data }: { data: DashboardStats }) {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  return (
    <>
      <Grid container spacing={2} mb={4}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label={t("insights.stats.totalVehicles")} value={data.totalCars} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label={t("insights.stats.piecesOwned")} value={data.totalQuantity} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label={t("insights.stats.owned")} value={data.ownedCount} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label={t("insights.stats.wishlist")} value={data.wishlistCount} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label={t("insights.stats.sets")} value={data.totalSets} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label={t("insights.stats.setsOwned")} value={data.setsOwned} />
        </Grid>
        <Grid size={{ xs: 12, sm: 8, md: 4 }}>
          <StatCard
            label={t("insights.stats.collectionValue")}
            value={formatCurrency(data.collectionValue, currency, { maximumFractionDigits: 0 })}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t("insights.stats.byManufacturer")}
              </Typography>
              {data.byManufacturer.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("insights.stats.noData")}
                </Typography>
              ) : (
                <List dense disablePadding>
                  {data.byManufacturer.map((row) => (
                    <ListItem key={row.manufacturerName} disableGutters>
                      <ListItemText primary={row.manufacturerName} />
                      <Chip label={row.carCount} size="small" />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t("insights.stats.byVehicleType")}
              </Typography>
              {data.byVehicleType.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("insights.stats.noData")}
                </Typography>
              ) : (
                <List dense disablePadding>
                  {data.byVehicleType.map((row) => (
                    <ListItem key={row.vehicleTypeName} disableGutters>
                      <ListItemText primary={row.vehicleTypeName} />
                      <Chip label={row.carCount} size="small" />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t("insights.stats.recentlyAdded")}
              </Typography>
              {data.recentlyAdded.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("insights.stats.noVehicles")}
                </Typography>
              ) : (
                <List dense disablePadding>
                  {data.recentlyAdded.map((car) => (
                    <ListItem key={car.id} disableGutters>
                      <ListItemText primary={car.name} secondary={car.manufacturerName} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
