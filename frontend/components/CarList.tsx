import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import Grid from "@mui/material/Grid2";
import { useTranslation } from "react-i18next";
import type { CarStatus } from "../api/types";
import { useCarList } from "../hooks/useCars";
import { useColors, useManufacturers, useVehicleTypes } from "../hooks/useLookups";
import AutocompleteSelect from "./AutocompleteSelect";
import CarCard from "./CarCard";
import CollectionSubNav from "./CollectionSubNav";
import VirtualCarGrid from "./VirtualCarGrid";

type StatusFilter = CarStatus | "all";
const STATUS_FILTERS: StatusFilter[] = ["all", "owned", "wishlist"];

const CarList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [manufacturerId, setManufacturerId] = useState<number | null>(null);
  const [vehicleTypeId, setVehicleTypeId] = useState<number | null>(null);
  const [colorId, setColorId] = useState<number | null>(null);

  const { data: manufacturers } = useManufacturers();
  const { data: vehicleTypes } = useVehicleTypes();
  const { data: colors } = useColors();
  const { data: cars, isLoading } = useCarList({
    search: search || undefined,
    manufacturerId: manufacturerId ?? undefined,
    vehicleTypeId: vehicleTypeId ?? undefined,
    colorId: colorId ?? undefined,
    status: status === "all" ? undefined : status,
  });

  const statusLabel = (value: StatusFilter) =>
    value === "all" ? t("common.all") : t(`status.${value}`);

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h4" component="h1">
          {t("vehicles.title")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/collection/vehicles/add")}
        >
          {t("vehicles.addVehicle")}
        </Button>
      </Stack>
      <CollectionSubNav />

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label={t("common.search")}
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AutocompleteSelect<StatusFilter>
              label={t("common.status")}
              fullWidth
              disableClearable
              options={STATUS_FILTERS}
              value={status}
              getOptionLabel={statusLabel}
              onChange={(newValue) => setStatus(newValue ?? "all")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <AutocompleteSelect
              label={t("common.manufacturer")}
              fullWidth
              options={manufacturers ?? []}
              value={manufacturers?.find((m) => m.id === manufacturerId) ?? null}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, val) => option.id === val.id}
              onChange={(newValue) => setManufacturerId(newValue?.id ?? null)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <AutocompleteSelect
              label={t("vehicles.vehicleType")}
              fullWidth
              options={vehicleTypes ?? []}
              value={vehicleTypes?.find((v) => v.id === vehicleTypeId) ?? null}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, val) => option.id === val.id}
              onChange={(newValue) => setVehicleTypeId(newValue?.id ?? null)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <AutocompleteSelect
              label={t("common.color")}
              fullWidth
              options={colors ?? []}
              value={colors?.find((c) => c.id === colorId) ?? null}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, val) => option.id === val.id}
              onChange={(newValue) => setColorId(newValue?.id ?? null)}
            />
          </Grid>
        </Grid>
      </Paper>

      {isLoading ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>
      ) : !cars?.length ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("vehicles.noneFound")}</Paper>
      ) : (
        <VirtualCarGrid
          items={cars}
          getKey={(car) => car.id}
          renderItem={(car) => (
            <CarCard car={car} onClick={() => navigate(`/collection/vehicles/${car.id}/edit`)} />
          )}
        />
      )}
    </Stack>
  );
};

export default CarList;
