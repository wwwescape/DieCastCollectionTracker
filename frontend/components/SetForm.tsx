import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid2";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";
import type { CatalogSourceId } from "../api/catalog";
import {
  SET_TYPES,
  type CarCondition,
  type CarSet,
  type CarStatus,
  type SetInput,
  type SetType,
} from "../api/types";
import { useCarList } from "../hooks/useCars";
import { useManufacturers, useSeries } from "../hooks/useLookups";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import AutocompleteSelect from "./AutocompleteSelect";
import FreeSoloLookupField from "./FreeSoloLookupField";
import {
  CatalogMatchChip,
  ConditionField,
  FormSection,
  HALF,
  LinkedItemsField,
  PhotoUploadField,
  PriceField,
  StatusField,
  TagsField,
} from "./ItemFormFields";

export interface SetFormValues {
  name: string;
  manufacturer: string;
  series: string;
  setType: SetType;
  toyNumber: string;
  year: string;
  status: CarStatus;
  quantity: string;
  condition: CarCondition | null;
  purchasePrice: string;
  sealed: boolean;
  vehicleIds: number[];
  // One vehicle per line, as listed by the wiki or on the box.
  contents: string;
  tags: string[];
  notes: string;
  photo: string;
  catalogSource: CatalogSourceId | null;
  catalogTitle: string | null;
}

const EMPTY_VALUES: SetFormValues = {
  name: "",
  manufacturer: "",
  series: "",
  setType: "playset",
  toyNumber: "",
  year: "",
  status: "owned",
  quantity: "1",
  condition: null,
  purchasePrice: "",
  sealed: true,
  vehicleIds: [],
  contents: "",
  tags: [],
  notes: "",
  photo: "",
  catalogSource: null,
  catalogTitle: null,
};

export function setToFormValues(set: CarSet): SetFormValues {
  return {
    name: set.name,
    manufacturer: set.manufacturerName,
    series: set.seriesName ?? "",
    setType: set.setType,
    toyNumber: set.toyNumber ?? "",
    year: set.year?.toString() ?? "",
    status: set.status,
    quantity: set.quantity.toString(),
    condition: set.condition,
    purchasePrice: set.purchasePrice?.toString() ?? "",
    sealed: set.sealed,
    vehicleIds: set.vehicles.map((vehicle) => vehicle.id),
    contents: set.contents.join("\n"),
    tags: set.tags.map((tag) => tag.name),
    notes: set.notes ?? "",
    photo: set.photo ?? "",
    catalogSource: set.catalogSource,
    catalogTitle: set.catalogTitle,
  };
}

export function formValuesToSetInput(values: SetFormValues, includePhoto = true): SetInput {
  return {
    name: values.name.trim(),
    manufacturer: values.manufacturer.trim(),
    series: values.series.trim() || null,
    setType: values.setType,
    toyNumber: values.toyNumber.trim() || null,
    year: values.year.trim() ? Number(values.year) : null,
    status: values.status,
    quantity: values.quantity.trim() ? Number(values.quantity) : 1,
    condition: values.condition,
    purchasePrice: values.purchasePrice.trim() ? Number(values.purchasePrice) : null,
    sealed: values.sealed,
    vehicleIds: values.vehicleIds,
    contents: values.contents
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    tags: values.tags,
    notes: values.notes.trim() || null,
    ...(includePhoto ? { photo: values.photo.trim() || null } : {}),
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
  // Off when editing: the photo gallery below the form manages photos then.
  showPhotoUpload?: boolean;
}

const SetForm = ({
  initialValues = EMPTY_VALUES,
  submitLabel,
  onSubmit,
  showPhotoUpload = true,
}: SetFormProps) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<SetFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const { data: manufacturers } = useManufacturers();
  const { data: vehicles } = useCarList();
  const selectedManufacturer = manufacturers?.find((m) => m.name === values.manufacturer);
  const { data: series } = useSeries(selectedManufacturer?.id);

  const setField = <K extends keyof SetFormValues>(key: K, value: SetFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.name.trim() || !values.manufacturer.trim()) {
      toast.error(t("common.nameAndManufacturerRequired"), TOAST_OPTIONS);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(formValuesToSetInput(values, showPhotoUpload));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }} component="form" onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        <CatalogMatchChip
          source={values.catalogSource}
          title={values.catalogTitle}
          onClear={() =>
            setValues((prev) => ({ ...prev, catalogSource: null, catalogTitle: null }))
          }
        />
        <FormSection title={t("form.details")}>
          <Grid size={HALF}>
            <TextField
              label={t("common.name")}
              required
              fullWidth
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
            />
          </Grid>
          <Grid size={HALF}>
            <FreeSoloLookupField
              label={t("common.manufacturer")}
              required
              options={manufacturers ?? []}
              value={values.manufacturer}
              onChange={(value) => setField("manufacturer", value)}
            />
          </Grid>
          <Grid size={HALF}>
            <FreeSoloLookupField
              label={t("vehicles.series")}
              options={series ?? []}
              value={values.series}
              onChange={(value) => setField("series", value)}
            />
          </Grid>
          <Grid size={HALF}>
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
        </FormSection>

        <FormSection title={t("form.identification")}>
          <Grid size={HALF}>
            <TextField
              label={t("sets.toyNumber")}
              fullWidth
              value={values.toyNumber}
              onChange={(event) => setField("toyNumber", event.target.value)}
            />
          </Grid>
          <Grid size={HALF}>
            <TextField
              type="number"
              label={t("common.year")}
              fullWidth
              value={values.year}
              onChange={(event) => setField("year", event.target.value)}
            />
          </Grid>
        </FormSection>

        <FormSection title={t("form.ownership")}>
          <Grid size={HALF}>
            <StatusField value={values.status} onChange={(value) => setField("status", value)} />
          </Grid>
          <Grid size={HALF}>
            <TextField
              type="number"
              label={t("common.quantity")}
              fullWidth
              value={values.quantity}
              onChange={(event) => setField("quantity", event.target.value)}
            />
          </Grid>
          <Grid size={HALF}>
            <ConditionField
              value={values.condition}
              onChange={(value) => setField("condition", value)}
            />
          </Grid>
          <Grid size={HALF}>
            <PriceField
              value={values.purchasePrice}
              onChange={(value) => setField("purchasePrice", value)}
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
        </FormSection>

        <FormSection title={t("form.links")}>
          <Grid size={12}>
            <LinkedItemsField
              label={t("sets.linkedVehicles")}
              helperText={t("sets.linkedVehiclesHelper")}
              options={vehicles ?? []}
              value={values.vehicleIds}
              onChange={(ids) => setField("vehicleIds", ids)}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label={t("sets.vehiclesIncluded")}
              helperText={t("sets.onePerLine")}
              fullWidth
              multiline
              minRows={3}
              value={values.contents}
              onChange={(event) => setField("contents", event.target.value)}
            />
          </Grid>
        </FormSection>

        <FormSection title={t("form.tagsAndNotes")}>
          <Grid size={12}>
            <TagsField value={values.tags} onChange={(value) => setField("tags", value)} />
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
        </FormSection>

        {showPhotoUpload ? (
          <FormSection title={t("form.photo")}>
            <Grid size={12}>
              <PhotoUploadField
                value={values.photo}
                previewAlt={t("sets.photoPreview")}
                onChange={(url) => setField("photo", url)}
              />
            </Grid>
          </FormSection>
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

export default SetForm;
