import { useNavigate, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CarCard from "../components/CarCard";
import ManufacturerLogo from "../components/ManufacturerLogo";
import SetCard from "../components/SetCard";
import { useCarList } from "../hooks/useCars";
import { useManufacturers } from "../hooks/useLookups";
import { useSetList } from "../hooks/useSets";
import { useTranslation } from "react-i18next";

const CARD_GRID_SIZE = { xs: 12, sm: 6, md: 4, lg: 3 } as const;

// Everything from one manufacturer: its cars, then its sets. A plain grid rather than
// VirtualCarGrid, since two window-scrolled virtual grids on one page would fight over the
// scroll offset; one manufacturer's items are a fraction of the collection anyway.
const ManufacturerPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const manufacturerId = Number(id);
  const { data: manufacturers, isLoading: manufacturersLoading } = useManufacturers();
  const manufacturer = manufacturers?.find((m) => m.id === manufacturerId);
  const { data: cars, isLoading: carsLoading } = useCarList({ manufacturerId });
  const { data: sets, isLoading: setsLoading } = useSetList({ manufacturerId });

  const back = (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/collection/manufacturers")}>
        {t("manufacturers.all")}
      </Button>
    </div>
  );

  if (manufacturersLoading) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>;
  }
  if (!manufacturer) {
    return (
      <Stack spacing={2}>
        {back}
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("manufacturers.notFound")}</Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {back}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" } }}
      >
        <Box sx={{ width: { xs: "100%", sm: 260 }, flexShrink: 0 }}>
          <ManufacturerLogo name={manufacturer.name} height={100} />
        </Box>
        <Typography variant="h4" component="h1">
          {manufacturer.name}
        </Typography>
      </Stack>

      <Section
        title={t("nav.vehicles")}
        loading={carsLoading}
        empty={t("manufacturers.noVehicles")}
      >
        {cars?.length ? (
          <Grid container spacing={2}>
            {cars.map((car) => (
              <Grid key={car.id} size={CARD_GRID_SIZE}>
                <CarCard
                  car={car}
                  onClick={() => navigate(`/collection/vehicles/${car.id}/edit`)}
                />
              </Grid>
            ))}
          </Grid>
        ) : null}
      </Section>

      <Section title={t("nav.sets")} loading={setsLoading} empty={t("manufacturers.noSets")}>
        {sets?.length ? (
          <Grid container spacing={2}>
            {sets.map((set) => (
              <Grid key={set.id} size={CARD_GRID_SIZE}>
                <SetCard set={set} onClick={() => navigate(`/collection/sets/${set.id}/edit`)} />
              </Grid>
            ))}
          </Grid>
        ) : null}
      </Section>
    </Stack>
  );
};

interface SectionProps {
  title: string;
  loading: boolean;
  empty: string;
  children: React.ReactNode;
}

function Section({ title, loading, empty, children }: SectionProps) {
  const { t } = useTranslation();
  return (
    <Box component="section">
      <Typography variant="h5" component="h2" gutterBottom>
        {title}
      </Typography>
      {loading ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>
      ) : (
        (children ?? (
          <Paper sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>{empty}</Paper>
        ))
      )}
    </Box>
  );
}

export default ManufacturerPage;
