import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid2";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";
import type { CatalogSourceId } from "../api/catalog";
import type { Car, CarCondition, CarInput, CarStatus } from "../api/types";
import { useManufacturers, useSeries, useVehicleTypes, useColors } from "../hooks/useLookups";
import { useSetList } from "../hooks/useSets";
import { TOAST_OPTIONS } from "../utils/toastOptions";
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
  THIRD,
} from "./ItemFormFields";

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
  setIds: number[];
  catalogSource: CatalogSourceId | null;
  catalogTitle: string | null;
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
  setIds: [],
  catalogSource: null,
  catalogTitle: null,
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
    setIds: car.sets.map((set) => set.id),
    catalogSource: car.catalogSource,
    catalogTitle: car.catalogTitle,
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
    setIds: values.setIds,
    catalogSource: values.catalogSource && values.catalogTitle ? values.catalogSource : null,
    catalogTitle: values.catalogSource && values.catalogTitle ? values.catalogTitle : null,
  };
}

export function withFormDefaults(values: Partial<CarFormValues>): CarFormValues {
  return { ...EMPTY_VALUES, ...values };
}

interface CarFormProps {
  initialValues?: CarFormValues;
  submitLabel: string;
  onSubmit: (input: CarInput) => Promise<void>;
  showPhotoUpload?: boolean;
}

const CarForm = ({
  initialValues = EMPTY_VALUES,
  submitLabel,
  onSubmit,
  showPhotoUpload = true,
}: CarFormProps) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<CarFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);

  const { data: manufacturers } = useManufacturers();
  const { data: vehicleTypes } = useVehicleTypes();
  const { data: colors } = useColors();
  const { data: sets } = useSetList();
  const selectedManufacturer = manufacturers?.find((m) => m.name === values.manufacturer);
  const { data: series } = useSeries(selectedManufacturer?.id);

  const setField = <K extends keyof CarFormValues>(key: K, value: CarFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.name.trim() || !values.manufacturer.trim()) {
      toast.error(t("common.nameAndManufacturerRequired"), TOAST_OPTIONS);
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
          <Grid size={THIRD}>
            <FreeSoloLookupField
              label={t("vehicles.series")}
              options={series ?? []}
              value={values.series}
              onChange={(value) => setField("series", value)}
            />
          </Grid>
          <Grid size={THIRD}>
            <FreeSoloLookupField
              label={t("vehicles.vehicleType")}
              options={vehicleTypes ?? []}
              value={values.vehicleType}
              onChange={(value) => setField("vehicleType", value)}
            />
          </Grid>
          <Grid size={THIRD}>
            <FreeSoloLookupField
              label={t("common.color")}
              options={colors ?? []}
              value={values.color}
              onChange={(value) => setField("color", value)}
            />
          </Grid>
        </FormSection>

        <FormSection title={t("form.identification")}>
          <Grid size={THIRD}>
            <TextField
              label={t("vehicles.castNumber")}
              fullWidth
              value={values.castNumber}
              onChange={(event) => setField("castNumber", event.target.value)}
            />
          </Grid>
          <Grid size={THIRD}>
            <TextField
              label={t("vehicles.collectionNumber")}
              fullWidth
              value={values.collectionNumber}
              onChange={(event) => setField("collectionNumber", event.target.value)}
            />
          </Grid>
          <Grid size={THIRD}>
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
        </FormSection>

        <FormSection title={t("form.links")}>
          <Grid size={12}>
            <LinkedItemsField
              label={t("vehicles.linkedSets")}
              helperText={t("vehicles.linkedSetsHelper")}
              options={sets ?? []}
              value={values.setIds}
              onChange={(ids) => setField("setIds", ids)}
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
                previewAlt={t("vehicles.photoPreview")}
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

export default CarForm;
