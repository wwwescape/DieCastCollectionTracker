import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "react-toastify";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid2";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "../api/client";
import type { CatalogSourceId } from "../api/catalog";
import { SET_TYPES, type CarSet, type CarStatus, type SetInput, type SetType } from "../api/types";
import { useManufacturers } from "../hooks/useLookups";
import { useUploadCarImage } from "../hooks/useUploads";
import { useCurrency } from "../theme/CurrencyProvider";
import { CATALOG_SOURCE_LABELS } from "../utils/catalog";
import { getCurrencySymbol } from "../utils/currency";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import AutocompleteSelect from "./AutocompleteSelect";
import FreeSoloLookupField from "./FreeSoloLookupField";

const STATUSES: CarStatus[] = ["owned", "wishlist"];

export interface SetFormValues {
  name: string;
  manufacturer: string;
  setType: SetType;
  toyNumber: string;
  year: string;
  status: CarStatus;
  sealed: boolean;
  quantity: string;
  purchasePrice: string;
  notes: string;
  photo: string;
  // One car per line.
  contents: string;
  catalogSource: CatalogSourceId | null;
  catalogTitle: string | null;
}

const EMPTY_VALUES: SetFormValues = {
  name: "",
  manufacturer: "",
  setType: "playset",
  toyNumber: "",
  year: "",
  status: "owned",
  sealed: true,
  quantity: "1",
  purchasePrice: "",
  notes: "",
  photo: "",
  contents: "",
  catalogSource: null,
  catalogTitle: null,
};

export function setToFormValues(set: CarSet): SetFormValues {
  return {
    name: set.name,
    manufacturer: set.manufacturerName,
    setType: set.setType,
    toyNumber: set.toyNumber ?? "",
    year: set.year?.toString() ?? "",
    status: set.status,
    sealed: set.sealed,
    quantity: set.quantity.toString(),
    purchasePrice: set.purchasePrice?.toString() ?? "",
    notes: set.notes ?? "",
    photo: set.photo ?? "",
    contents: set.contents.join("\n"),
    catalogSource: set.catalogSource,
    catalogTitle: set.catalogTitle,
  };
}

export function formValuesToSetInput(values: SetFormValues): SetInput {
  return {
    name: values.name.trim(),
    manufacturer: values.manufacturer.trim(),
    setType: values.setType,
    toyNumber: values.toyNumber.trim() || null,
    year: values.year.trim() ? Number(values.year) : null,
    status: values.status,
    sealed: values.sealed,
    quantity: values.quantity.trim() ? Number(values.quantity) : 1,
    purchasePrice: values.purchasePrice.trim() ? Number(values.purchasePrice) : null,
    notes: values.notes.trim() || null,
    photo: values.photo.trim() || null,
    contents: values.contents
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    catalogSource: values.catalogSource && values.catalogTitle ? values.catalogSource : null,
    catalogTitle: values.catalogSource && values.catalogTitle ? values.catalogTitle : null,
  };
}

export function withSetFormDefaults(values: Partial<SetFormValues>): SetFormValues {
  return { ...EMPTY_VALUES, ...values };
}

interface SetFormProps {
  initialValues?: SetFormValues;
  submitLabel: string;
  onSubmit: (input: SetInput) => Promise<void>;
}

const SetForm = ({ initialValues = EMPTY_VALUES, submitLabel, onSubmit }: SetFormProps) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<SetFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const { currency } = useCurrency();
  const { data: manufacturers } = useManufacturers();
  const uploadImage = useUploadCarImage();

  const setField = <K extends keyof SetFormValues>(key: K, value: SetFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setField("photo", await uploadImage.mutateAsync(file));
    } catch (error) {
      console.error("Error uploading set photo:", error);
      toast.error(t("common.uploadPhotoError"), TOAST_OPTIONS);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.name.trim() || !values.manufacturer.trim()) {
      toast.error(t("common.nameAndManufacturerRequired"), TOAST_OPTIONS);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(formValuesToSetInput(values));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }} component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2.5}>
        {values.catalogSource && values.catalogTitle ? (
          <Grid size={12}>
            <Chip
              icon={<MenuBookIcon />}
              label={t("common.matchedTo", {
                title: values.catalogTitle,
                wiki: CATALOG_SOURCE_LABELS[values.catalogSource],
              })}
              variant="outlined"
              color="primary"
              onDelete={() =>
                setValues((prev) => ({ ...prev, catalogSource: null, catalogTitle: null }))
              }
              sx={{ maxWidth: "100%" }}
            />
          </Grid>
        ) : null}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label={t("common.name")}
            required
            fullWidth
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FreeSoloLookupField
            label={t("common.manufacturer")}
            required
            options={manufacturers ?? []}
            value={values.manufacturer}
            onChange={(value) => setField("manufacturer", value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteSelect<SetType>
            label={t("common.type")}
            fullWidth
            disableClearable
            options={SET_TYPES}
            value={values.setType}
            getOptionLabel={(option) => t(`setTypes.${option}`)}
            onChange={(newValue) => setField("setType", newValue ?? "playset")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label={t("sets.toyNumber")}
            fullWidth
            value={values.toyNumber}
            onChange={(event) => setField("toyNumber", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="number"
            label={t("common.year")}
            fullWidth
            value={values.year}
            onChange={(event) => setField("year", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteSelect<CarStatus>
            label={t("common.status")}
            fullWidth
            disableClearable
            options={STATUSES}
            value={values.status}
            getOptionLabel={(option) => t(`status.${option}`)}
            onChange={(newValue) => setField("status", newValue ?? "owned")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="number"
            label={t("common.quantity")}
            fullWidth
            value={values.quantity}
            onChange={(event) => setField("quantity", event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            type="number"
            label={t("common.purchasePrice")}
            fullWidth
            value={values.purchasePrice}
            onChange={(event) => setField("purchasePrice", event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">{getCurrencySymbol(currency)}</InputAdornment>
                ),
              },
            }}
          />
        </Grid>
        <Grid size={12}>
          <FormControlLabel
            control={
              <Switch
                checked={values.sealed}
                onChange={(event) => setField("sealed", event.target.checked)}
              />
            }
            label={t("sets.stillSealed")}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label={t("sets.carsIncluded")}
            helperText={t("sets.onePerLine")}
            fullWidth
            multiline
            minRows={3}
            value={values.contents}
            onChange={(event) => setField("contents", event.target.value)}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label={t("common.notes")}
            fullWidth
            multiline
            minRows={3}
            value={values.notes}
            onChange={(event) => setField("notes", event.target.value)}
          />
        </Grid>
        <Grid size={12}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              component="label"
              variant="outlined"
              startIcon={
                uploadImage.isPending ? <CircularProgress size={16} /> : <CloudUploadIcon />
              }
              disabled={uploadImage.isPending}
            >
              {values.photo ? t("common.replacePhoto") : t("common.uploadPhoto")}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => void handlePhotoChange(event)}
              />
            </Button>
            {values.photo ? (
              <>
                <Box
                  component="img"
                  src={resolveAssetUrl(values.photo) ?? undefined}
                  alt={t("sets.photoPreview")}
                  sx={{
                    height: 56,
                    width: "auto",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
                <IconButton
                  size="small"
                  aria-label={t("common.removePhoto")}
                  onClick={() => setField("photo", "")}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            ) : null}
          </Stack>
        </Grid>
        <Grid size={12}>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitLabel}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SetForm;
