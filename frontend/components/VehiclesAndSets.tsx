import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import type { CarListParams } from "../api/cars";
import type { SetListParams } from "../api/sets";
import { useCarList } from "../hooks/useCars";
import { useSetList } from "../hooks/useSets";
import { openedFrom } from "../utils/navState";
import CarCard from "./CarCard";
import { Section } from "./Detail";
import { EmptyState } from "./ListViews";
import SetCard from "./SetCard";

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
  const location = useLocation();
  const inYear = (item: { year: number | null }) => year === undefined || item.year === year;
  const { data: allCars, isLoading: carsLoading } = useCarList(filter);
  const { data: allSets, isLoading: setsLoading } = useSetList(filter);
  const cars = allCars?.filter(inYear);
  const sets = allSets?.filter(inYear);

  return (
    <>
      <Section title={`${t("nav.vehicles")}${cars?.length ? ` · ${cars.length}` : ""}`}>
        <Grid loading={carsLoading} empty={noVehicles}>
          {cars?.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              onClick={() =>
                navigate(`/collection/vehicles/${car.id}`, { state: openedFrom(location) })
              }
            />
          ))}
        </Grid>
      </Section>
      <Section title={`${t("nav.sets")}${sets?.length ? ` · ${sets.length}` : ""}`}>
        <Grid loading={setsLoading} empty={noSets}>
          {sets?.map((set) => (
            <SetCard
              key={set.id}
              set={set}
              onClick={() =>
                navigate(`/collection/sets/${set.id}`, { state: openedFrom(location) })
              }
            />
          ))}
        </Grid>
      </Section>
    </>
  );
};

function Grid({
  loading,
  empty,
  children,
}: {
  loading: boolean;
  empty: string;
  children?: ReactNode[];
}) {
  const { t } = useTranslation();
  if (loading) return <EmptyState>{t("common.loading")}</EmptyState>;
  if (!children?.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(auto-fill, minmax(190px, 1fr))",
        },
        gap: { xs: "14px 10px", sm: "18px 16px" },
      }}
    >
      {children}
    </Box>
  );
}

export default VehiclesAndSets;
