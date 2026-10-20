import type { ChangeEvent, ReactNode } from "react";
import { toast } from "react-toastify";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid2";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "../api/client";
import type { CatalogSourceId } from "../api/catalog";
import { CAR_CONDITIONS, type CarCondition, type CarStatus, type LinkedItem } from "../api/types";
import { useTags } from "../hooks/useTags";
import { useUploadCarImage } from "../hooks/useUploads";
import { useCurrency } from "../theme/CurrencyProvider";
import { CATALOG_SOURCE_LABELS } from "../utils/catalog";
import { getCurrencySymbol } from "../utils/currency";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import AutocompleteSelect from "./AutocompleteSelect";

// Building blocks shared by the Vehicle and Set forms, so both keep the same sections, field
// order and behaviour: Details → Identification → Ownership → Links → Tags & notes → Photo.

export const HALF = { xs: 12, sm: 6 } as const;
export const THIRD = { xs: 12, sm: 6, md: 4 } as const;

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Grid size={12}>
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ mb: 1.5, textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {title}
      </Typography>
      <Grid container spacing={2}>
        {children}
      </Grid>
    </Grid>
  );
}

export function CatalogMatchChip({
  source,
  title,
  onClear,
}: {
  source: CatalogSourceId | null;
  title: string | null;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  if (!source || !title) return null;
  return (
    <Grid size={12}>
      <Chip
        icon={<MenuBookIcon />}
        label={t("common.matchedTo", { title, wiki: CATALOG_SOURCE_LABELS[source] })}
        variant="outlined"
        color="primary"
        onDelete={onClear}
        sx={{ maxWidth: "100%" }}
      />
    </Grid>
  );
}

const STATUSES: CarStatus[] = ["owned", "wishlist"];

export function StatusField({
  value,
  onChange,
}: {
  value: CarStatus;
  onChange: (value: CarStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <AutocompleteSelect<CarStatus>
      label={t("common.status")}
      fullWidth
      disableClearable
      options={STATUSES}
      value={value}
      getOptionLabel={(option) => t(`status.${option}`)}
      onChange={(newValue) => onChange(newValue ?? "owned")}
    />
  );
}

// "none" stands in for "not specified" so the select always has a value.
type ConditionOption = CarCondition | "none";
const CONDITION_OPTIONS: ConditionOption[] = ["none", ...CAR_CONDITIONS];

export function ConditionField({
  value,
  onChange,
}: {
  value: CarCondition | null;
  onChange: (value: CarCondition | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <AutocompleteSelect<ConditionOption>
      label={t("vehicles.condition")}
      fullWidth
      options={CONDITION_OPTIONS}
      value={value ?? "none"}
      getOptionLabel={(option) =>
        option === "none" ? t("conditions.notSpecified") : t(`conditions.${option}`)
      }
      onChange={(newValue) => onChange(newValue && newValue !== "none" ? newValue : null)}
    />
  );
}

export function PriceField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  return (
    <TextField
      type="number"
      label={t("common.purchasePrice")}
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">{getCurrencySymbol(currency)}</InputAdornment>
          ),
        },
      }}
    />
  );
}

export function TagsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { t } = useTranslation();
  const { data: allTags } = useTags();
  return (
    <Autocomplete
      multiple
      freeSolo
      options={(allTags ?? []).map((tag) => tag.name)}
      value={value}
      onChange={(_event, newValue) => onChange(newValue)}
      renderInput={(params) => (
        <TextField {...params} label={t("common.tags")} placeholder={t("common.addTag")} />
      )}
    />
  );
}

// Picks vehicles for a set, or sets for a vehicle. Options show a thumbnail plus
// manufacturer and year, since names alone (a 5-pack's five vehicles) can be ambiguous.
export function LinkedItemsField({
  label,
  helperText,
  options,
  value,
  onChange,
}: {
  label: string;
  helperText: string;
  options: LinkedItem[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const selected = options.filter((option) => value.includes(option.id));
  const describe = (item: LinkedItem) =>
    [item.manufacturerName, item.year].filter(Boolean).join(" · ");
  return (
    <Autocomplete
      multiple
      options={options}
      value={selected}
      onChange={(_event, newValue) => onChange(newValue.map((item) => item.id))}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      renderOption={(props, option) => {
        const { key, ...rest } = props as typeof props & { key: string };
        return (
          <Box
            component="li"
            key={key}
            {...rest}
            sx={{ display: "flex", gap: 1.5, alignItems: "center" }}
          >
            <Avatar
              variant="rounded"
              src={resolveAssetUrl(option.photo) ?? undefined}
              alt=""
              sx={{ width: 40, height: 30 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {option.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {describe(option)}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => <TextField {...params} label={label} helperText={helperText} />}
    />
  );
}

export function PhotoUploadField({
  value,
  previewAlt,
  onChange,
}: {
  value: string;
  previewAlt: string;
  onChange: (url: string) => void;
}) {
  const { t } = useTranslation();
  const uploadImage = useUploadCarImage();

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      onChange(await uploadImage.mutateAsync(file));
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error(t("common.uploadPhotoError"), TOAST_OPTIONS);
    }
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Button
        component="label"
        variant="outlined"
        startIcon={uploadImage.isPending ? <CircularProgress size={16} /> : <CloudUploadIcon />}
        disabled={uploadImage.isPending}
      >
        {value ? t("common.replacePhoto") : t("common.uploadPhoto")}
        <input type="file" accept="image/*" hidden onChange={(event) => void handleChange(event)} />
      </Button>
      {value ? (
        <>
          <Box
            component="img"
            src={resolveAssetUrl(value) ?? undefined}
            alt={previewAlt}
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
            onClick={() => onChange("")}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      ) : null}
    </Stack>
  );
}
