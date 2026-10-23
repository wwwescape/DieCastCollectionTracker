import { useState } from "react";
import { useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CarCard from "../components/CarCard";
import { EmptyState } from "../components/ListViews";
import SetCard from "../components/SetCard";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePublicCars, usePublicSets } from "../hooks/usePublic";
import { useTranslation } from "react-i18next";

const GRID_SX = {
  display: "grid",
  gridTemplateColumns: {
    xs: "repeat(2, minmax(0, 1fr))",
    sm: "repeat(auto-fill, minmax(190px, 1fr))",
  },
  gap: { xs: "14px 10px", sm: "18px 16px" },
} as const;

interface PublicCollectionPageProps {
  kind: "vehicles" | "sets";
}

// The share-link view of Cars or Sets: read-only cards with a search box. A wrong or revoked
// token comes back as 404 from the API, shown as "link no longer works".
const PublicCollectionPage = ({ kind }: PublicCollectionPageProps) => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 500);
  const cars = usePublicCars(kind === "vehicles" ? token : undefined, debouncedSearch);
  const sets = usePublicSets(kind === "sets" ? token : undefined, debouncedSearch);
  const query = kind === "vehicles" ? cars : sets;

  const title = kind === "vehicles" ? t("nav.vehicles") : t("nav.sets");

  let body: React.ReactNode;
  if (query.isLoading) {
    body = <EmptyState>{t("common.loading")}</EmptyState>;
  } else if (query.error) {
    body = (
      <EmptyState>
        {isAxiosError(query.error) && query.error.response?.status === 404
          ? t("public.linkGone")
          : t("public.loadError")}
      </EmptyState>
    );
  } else if (kind === "vehicles" && cars.data?.length) {
    body = (
      <Box sx={GRID_SX}>
        {cars.data.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </Box>
    );
  } else if (kind === "sets" && sets.data?.length) {
    body = (
      <Box sx={GRID_SX}>
        {sets.data.map((set) => (
          <SetCard key={set.id} set={set} />
        ))}
      </Box>
    );
  } else {
    body = (
      <EmptyState>{kind === "vehicles" ? t("vehicles.noneFound") : t("sets.noneFound")}</EmptyState>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          mb: 2,
        }}
      >
        <Typography component="h1" sx={{ fontSize: 13, fontWeight: 600 }}>
          {title}
        </Typography>
        <TextField
          label={kind === "vehicles" ? t("public.searchVehicles") : t("public.searchSets")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: { xs: "100%", sm: 320 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      {body}
    </>
  );
};

export default PublicCollectionPage;
