import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import Grid from "@mui/material/Grid2";
import type { Car, CarStatus } from "../api/types";
import { useCarList, useDeleteCar } from "../hooks/useCars";
import { useColors, useManufacturers, useVehicleTypes } from "../hooks/useLookups";
import { useUndoableAction } from "../hooks/useUndoableAction";
import AutocompleteSelect from "./AutocompleteSelect";
import CarCard from "./CarCard";
import VirtualCarGrid from "./VirtualCarGrid";
import { showUndoToast } from "./UndoToast";

interface StatusOption {
  value: CarStatus | "all";
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "wishlist", label: "Wishlist" },
];

const CarList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusOption>(STATUS_OPTIONS[0]);
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
    status: status.value === "all" ? undefined : status.value,
  });
  const deleteCar = useDeleteCar();

  const { schedule: scheduleDeletion, isPending: isCarPending } = useUndoableAction<Car>({
    getId: (car) => car.id,
    onCommit: async (carsToDelete) => {
      await Promise.all(carsToDelete.map((car) => deleteCar.mutateAsync(car.id)));
    },
  });

  const handleDeleteCar = (car: Car) => {
    const { undo } = scheduleDeletion([car]);
    showUndoToast(`"${car.name}" removed from your collection`, undo, 5000);
  };

  const visibleCars = (cars ?? []).filter((car) => !isCarPending(car.id));

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h4" component="h1">
          My Collection
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/cars/add")}>
          Add Car
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Search"
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AutocompleteSelect<StatusOption>
              label="Status"
              fullWidth
              disableClearable
              options={STATUS_OPTIONS}
              value={status}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, val) => option.value === val.value}
              onChange={(newValue) => setStatus(newValue ?? STATUS_OPTIONS[0])}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <AutocompleteSelect
              label="Manufacturer"
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
              label="Vehicle type"
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
              label="Color"
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
        <Paper sx={{ p: 3, textAlign: "center" }}>Loading...</Paper>
      ) : visibleCars.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>No cars found.</Paper>
      ) : (
        <VirtualCarGrid
          items={visibleCars}
          getKey={(car) => car.id}
          renderItem={(car) => (
            <CarCard
              car={car}
              onClick={() => navigate(`/cars/${car.id}/edit`)}
              onDelete={() => handleDeleteCar(car)}
            />
          )}
        />
      )}
    </Stack>
  );
};

export default CarList;
