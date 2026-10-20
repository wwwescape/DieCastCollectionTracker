import { useState } from "react";
import { useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import CarCard from "../components/CarCard";
import SetCard from "../components/SetCard";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePublicCars, usePublicSets } from "../hooks/usePublic";
import { useTranslation } from "react-i18next";

const CARD_GRID_SIZE = { xs: 12, sm: 6, md: 4, lg: 3 } as const;

interface PublicCollectionPageProps {
  kind: "cars" | "sets";
}

// The share-link view of Cars or Sets: read-only cards with a search box. A wrong or revoked
// token comes back as 404 from the API, shown as "link no longer works".
const PublicCollectionPage = ({ kind }: PublicCollectionPageProps) => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 500);
  const cars = usePublicCars(kind === "cars" ? token : undefined, debouncedSearch);
  const sets = usePublicSets(kind === "sets" ? token : undefined, debouncedSearch);
  const query = kind === "cars" ? cars : sets;

  const title = kind === "cars" ? t("nav.cars") : t("nav.sets");

  let body: React.ReactNode;
  if (query.isLoading) {
    body = <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>;
  } else if (query.error) {
    body = (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        {isAxiosError(query.error) && query.error.response?.status === 404
          ? t("public.linkGone")
          : t("public.loadError")}
      </Paper>
    );
  } else if (kind === "cars" && cars.data?.length) {
    body = (
      <Grid container spacing={2}>
        {cars.data.map((car) => (
          <Grid key={car.id} size={CARD_GRID_SIZE}>
            <CarCard car={car} />
          </Grid>
        ))}
      </Grid>
    );
  } else if (kind === "sets" && sets.data?.length) {
    body = (
      <Grid container spacing={2}>
        {sets.data.map((set) => (
          <Grid key={set.id} size={CARD_GRID_SIZE}>
            <SetCard set={set} />
          </Grid>
        ))}
      </Grid>
    );
  } else {
    body = (
      <Paper sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
        {kind === "cars" ? t("cars.noneFound") : t("sets.noneFound")}
      </Paper>
    );
  }

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>
      <TextField
        label={kind === "cars" ? t("public.searchCars") : t("public.searchSets")}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        fullWidth
        sx={{ mb: 3, maxWidth: 480 }}
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
      {body}
    </>
  );
};

export default PublicCollectionPage;
