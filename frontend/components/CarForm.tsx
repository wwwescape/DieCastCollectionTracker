import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "react-toastify";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid2";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { resolveAssetUrl } from "../api/client";
import type { Car, CarCondition, CarInput, CarStatus } from "../api/types";
import { CONDITION_LABELS } from "../api/types";
import { useManufacturers, useSeries, useVehicleTypes, useColors } from "../hooks/useLookups";
import { useTags } from "../hooks/useTags";
import { useUploadCarImage } from "../hooks/useUploads";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import AutocompleteSelect from "./AutocompleteSelect";
import FreeSoloLookupField from "./FreeSoloLookupField";

interface StatusOption {
  value: CarStatus;
  label: string;
}

interface ConditionOption {
  value: CarCondition | null;
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: "owned", label: "Owned" },
  { value: "wishlist", label: "Wishlist" },
];

const CONDITION_OPTIONS: ConditionOption[] = [
  { value: null, label: "Not specified" },
  ...Object.entries(CONDITION_LABELS).map(([value, label]) => ({
    value: value as CarCondition,
    label,
  })),
];

export interface CarFormValues {
  name: string;
  manufacturer: string;
  series: string;
  vehicleType: string;
  color: string;
  castNumber: string;
  collectionNumber: string;
  year: string;
  status: CarStatus;
  condition: CarCondition | null;
  quantity: string;
  purchasePrice: string;
  notes: string;
  photo: string;
  tags: string[];
}

const EMPTY_VALUES: CarFormValues = {
  name: "",
  manufacturer: "",
  series: "",
  vehicleType: "",
  color: "",
  castNumber: "",
  collectionNumber: "",
  year: "",
  status: "owned",
  condition: null,
  quantity: "1",
  purchasePrice: "",
  notes: "",
  photo: "",
  tags: [],
};

export function carToFormValues(car: Car): CarFormValues {
  return {
    name: car.name,
    manufacturer: car.manufacturerName,
    series: car.seriesName ?? "",
    vehicleType: car.vehicleTypeName ?? "",
    color: car.colorName ?? "",
    castNumber: car.castNumber ?? "",
    collectionNumber: car.collectionNumber ?? "",
    year: car.year?.toString() ?? "",
    status: car.status,
    condition: car.condition,
    quantity: car.quantity.toString(),
    purchasePrice: car.purchasePrice?.toString() ?? "",
    notes: car.notes ?? "",
    photo: car.photo ?? "",
    tags: car.tags.map((tag) => tag.name),
  };
}

export function formValuesToInput(values: CarFormValues, includePhoto = true): CarInput {
  return {
    name: values.name.trim(),
    manufacturer: values.manufacturer.trim(),
    series: values.series.trim() || null,
    vehicleType: values.vehicleType.trim() || null,
    color: values.color.trim() || null,
    castNumber: values.castNumber.trim() || null,
    collectionNumber: values.collectionNumber.trim() || null,
    year: values.year.trim() ? Number(values.year) : null,
    status: values.status,
    condition: values.condition,
    quantity: values.quantity.trim() ? Number(values.quantity) : 1,
    purchasePrice: values.purchasePrice.trim() ? Number(values.purchasePrice) : null,
    notes: values.notes.trim() || null,
    ...(includePhoto ? { photo: values.photo.trim() || null } : {}),
    tags: values.tags,
  };
}

interface CarFormProps {
  initialValues?: CarFormValues;
  submitLabel: string;
  onSubmit: (input: CarInput) => Promise<void>;
  showPhotoUpload?: boolean;
}

const CarForm = ({ initialValues = EMPTY_VALUES, submitLabel, onSubmit, showPhotoUpload = true }: CarFormProps) => {
  const [values, setValues] = useState<CarFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);

  const { data: manufacturers } = useManufacturers();
  const { data: vehicleTypes } = useVehicleTypes();
  const { data: colors } = useColors();
  const { data: allTags } = useTags();
  const selectedManufacturer = manufacturers?.find((m) => m.name === values.manufacturer);
  const { data: series } = useSeries(selectedManufacturer?.id);
  const uploadCarImage = useUploadCarImage();

  const setField = <K extends keyof CarFormValues>(key: K, value: CarFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const url = await uploadCarImage.mutateAsync(file);
      setField("photo", url);
    } catch (error) {
      console.error("Error uploading car photo:", error);
      toast.error("Error uploading photo. Please try again.", TOAST_OPTIONS);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.name.trim() || !values.manufacturer.trim()) {
      toast.error("Name and manufacturer are required.", TOAST_OPTIONS);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(formValuesToInput(values, showPhotoUpload));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }} component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Name"
            required
            fullWidth
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FreeSoloLookupField
            label="Manufacturer"
            required
            options={manufacturers ?? []}
            value={values.manufacturer}
            onChange={(value) => setField("manufacturer", value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FreeSoloLookupField
            label="Series"
            options={series ?? []}
            value={values.series}
            onChange={(value) => setField("series", value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FreeSoloLookupField
            label="Vehicle type"
            options={vehicleTypes ?? []}
            value={values.vehicleType}
            onChange={(value) => setField("vehicleType", value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FreeSoloLookupField
            label="Color"
            options={colors ?? []}
            value={values.color}
            onChange={(value) => setField("color", value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Cast number"
            fullWidth
            value={values.castNumber}
            onChange={(event) => setField("castNumber", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Collection number"
            fullWidth
            value={values.collectionNumber}
            onChange={(event) => setField("collectionNumber", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="number"
            label="Year"
            fullWidth
            value={values.year}
            onChange={(event) => setField("year", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteSelect<StatusOption>
            label="Status"
            fullWidth
            disableClearable
            options={STATUS_OPTIONS}
            value={STATUS_OPTIONS.find((option) => option.value === values.status) ?? null}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, val) => option.value === val.value}
            onChange={(newValue) => setField("status", newValue?.value ?? "owned")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteSelect<ConditionOption>
            label="Condition"
            fullWidth
            options={CONDITION_OPTIONS}
            value={CONDITION_OPTIONS.find((o) => o.value === values.condition) ?? CONDITION_OPTIONS[0]}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => o.value === v.value}
            onChange={(newValue) => setField("condition", newValue?.value ?? null)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="number"
            label="Quantity"
            fullWidth
            value={values.quantity}
            onChange={(event) => setField("quantity", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="number"
            label="Purchase price"
            fullWidth
            value={values.purchasePrice}
            onChange={(event) => setField("purchasePrice", event.target.value)}
          />
        </Grid>
        <Grid size={12}>
          <Autocomplete
            multiple
            freeSolo
            options={(allTags ?? []).map((tag) => tag.name)}
            value={values.tags}
            onChange={(_event, newValue) => setField("tags", newValue)}
            renderInput={(params) => <TextField {...params} label="Tags" placeholder="Add a tag" />}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Notes"
            fullWidth
            multiline
            minRows={3}
            value={values.notes}
            onChange={(event) => setField("notes", event.target.value)}
          />
        </Grid>
        {showPhotoUpload ? (
          <Grid size={12}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                component="label"
                variant="outlined"
                startIcon={uploadCarImage.isPending ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                disabled={uploadCarImage.isPending}
              >
                {values.photo ? "Replace photo" : "Upload photo"}
                <input type="file" accept="image/*" hidden onChange={(event) => void handlePhotoChange(event)} />
              </Button>
              {values.photo ? (
                <>
                  <Box
                    component="img"
                    src={resolveAssetUrl(values.photo) ?? undefined}
                    alt="Car photo preview"
                    sx={{ height: 56, width: "auto", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                  />
                  <IconButton size="small" aria-label="Remove photo" onClick={() => setField("photo", "")}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </>
              ) : null}
            </Stack>
          </Grid>
        ) : null}
        <Grid size={12}>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitLabel}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default CarForm;
