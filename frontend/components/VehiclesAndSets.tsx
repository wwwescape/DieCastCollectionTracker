import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import { useTranslation } from "react-i18next";
import type { CarListParams } from "../api/cars";
import type { SetListParams } from "../api/sets";
import { useCarList } from "../hooks/useCars";
import { useSetList } from "../hooks/useSets";
import CarCard from "./CarCard";
import SetCard from "./SetCard";

const CARD_GRID_SIZE = { xs: 12, sm: 6, md: 4, lg: 3 } as const;

// One manufacturer's or series' vehicles, then its sets. A plain grid rather than
// VirtualCarGrid, since two window-scrolled virtual grids on one page would fight over the
// scroll offset; a slice of the collection is small anyway.
const VehiclesAndSets = ({
  filter,
  year,
  noVehicles,
  noSets,
}: {
  filter: CarListParams & SetListParams;
  // Only items from this year (null: items without one); left out, every year.
  year?: number | null;
  noVehicles: string;
  noSets: string;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inYear = (item: { year: number | null }) => year === undefined || item.year === year;
  const { data: allCars, isLoading: carsLoading } = useCarList(filter);
  const { data: allSets, isLoading: setsLoading } = useSetList(filter);
  const cars = allCars?.filter(inYear);
  const sets = allSets?.filter(inYear);

  return (
    <>
      <Section title={t("nav.vehicles")} loading={carsLoading} empty={noVehicles}>
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

      <Section title={t("nav.sets")} loading={setsLoading} empty={noSets}>
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
    </>
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

export default VehiclesAndSets;
