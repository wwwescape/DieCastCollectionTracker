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
import { useDashboard } from "../hooks/useDashboard";

function StatCard({ label, value }: { label: string; value: number }) {
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

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>

      <Grid container spacing={2} mb={4}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="Total Cars" value={data.totalCars} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="Total Quantity" value={data.totalQuantity} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="Owned" value={data.ownedCount} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="Wishlist" value={data.wishlistCount} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                By Manufacturer
              </Typography>
              {data.byManufacturer.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No data yet.
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
                By Vehicle Type
              </Typography>
              {data.byVehicleType.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No data yet.
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
                Recently Added
              </Typography>
              {data.recentlyAdded.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No cars yet.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {data.recentlyAdded.map((car) => (
                    <ListItem key={car.id} disableGutters>
                      <ListItemText
                        primary={car.name}
                        secondary={car.manufacturerName}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
