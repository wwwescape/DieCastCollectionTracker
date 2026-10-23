import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import type { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import {
  useColors,
  useCreateColor,
  useCreateManufacturer,
  useCreateSeries,
  useCreateVehicleType,
  useDeleteColor,
  useDeleteManufacturer,
  useDeleteSeries,
  useDeleteVehicleType,
  LOOKUPS_USAGE_KEY,
  useLookupsUsage,
  useManufacturers,
  useSeries,
  useVehicleTypes,
} from "../hooks/useLookups";
import { useCreateTag, useDeleteTag, useTags } from "../hooks/useTags";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import LookupSection from "../components/LookupSection";
import AutocompleteSelect from "../components/AutocompleteSelect";
import Page from "../components/Page";
import { SettingsToolbar } from "../components/SettingsLayout";
import type { NamedLookup } from "../api/types";

// The API's 409 detail is English; the translated message says the same thing.
function deleteErrorKey(error: unknown): string {
  const ae = error as AxiosError<{ detail: string }>;
  return ae.response?.status === 409 ? "lookups.inUse" : "lookups.deleteError";
}

// Tabs are addressed by name in the URL (?tab=tags), so each one can be linked to and survives
// a refresh.
const TABS = [
  { key: "manufacturers", labelKey: "lookups.tabs.manufacturers" },
  { key: "series", labelKey: "lookups.tabs.series" },
  { key: "vehicle-types", labelKey: "lookups.tabs.vehicleTypes" },
  { key: "colors", labelKey: "lookups.tabs.colors" },
  { key: "tags", labelKey: "lookups.tabs.tags" },
] as const;

interface SimpleAddFormProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}

function SimpleAddForm({ label, value, onChange, onAdd }: SimpleAddFormProps) {
  const { t } = useTranslation();
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd();
  };

  return (
    <Stack
      component="form"
      direction="row"
      spacing={1}
      onSubmit={handleSubmit}
      flexWrap="wrap"
      useFlexGap
    >
      <TextField
        label={label}
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ minWidth: 220 }}
      />
      <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={!value.trim()}>
        {t("common.add")}
      </Button>
    </Stack>
  );
}

interface TabPanelProps {
  value: number;
  index: number;
  children: React.ReactNode;
}

function TabPanel({ value, index, children }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`lookups-tabpanel-${index}`}
      aria-labelledby={`lookups-tab-${index}`}
    >
      {value === index && children}
    </Box>
  );
}

// Settings → Lookups: the name lists cars and sets pick from, plus tags.
const LookupsPage = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = Math.max(
    0,
    TABS.findIndex((candidate) => candidate.key === params.get("tab"))
  );
  const setTab = (index: number) => setParams({ tab: TABS[index].key }, { replace: true });

  // What uses each entry, and whether a wiki-matched item does; refreshed after every change.
  const queryClient = useQueryClient();
  const { data: usage } = useLookupsUsage();
  const refreshUsage = () => queryClient.invalidateQueries({ queryKey: LOOKUPS_USAGE_KEY });

  // Manufacturers
  const { data: manufacturers, isLoading: mfrsLoading } = useManufacturers();
  const createManufacturer = useCreateManufacturer();
  const deleteManufacturer = useDeleteManufacturer();
  const [mfrName, setMfrName] = useState("");

  // Series
  const { data: allSeries, isLoading: seriesLoading } = useSeries();
  const createSeries = useCreateSeries();
  const deleteSeries = useDeleteSeries();
  const [seriesName, setSeriesName] = useState("");
  const [seriesManufacturer, setSeriesManufacturer] = useState<NamedLookup | null>(null);

  // Vehicle Types
  const { data: vehicleTypes, isLoading: vtLoading } = useVehicleTypes();
  const createVehicleType = useCreateVehicleType();
  const deleteVehicleType = useDeleteVehicleType();
  const [vtName, setVtName] = useState("");

  // Colors
  const { data: colors, isLoading: colorsLoading } = useColors();
  const createColor = useCreateColor();
  const deleteColor = useDeleteColor();
  const [colorName, setColorName] = useState("");

  // Tags
  const { data: tags, isLoading: tagsLoading } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [tagName, setTagName] = useState("");
  const [tagUseColor, setTagUseColor] = useState(false);
  const [tagColor, setTagColor] = useState("#1f67d8");

  const handleDelete = async (fn: () => Promise<void>) => {
    try {
      await fn();
      void refreshUsage();
      toast.success(t("lookups.deleted"), TOAST_OPTIONS);
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(t(deleteErrorKey(error)), TOAST_OPTIONS);
    }
  };

  const handleAddManufacturer = async () => {
    const name = mfrName.trim();
    if (!name) return;
    try {
      await createManufacturer.mutateAsync(name);
      setMfrName("");
      void refreshUsage();
      toast.success(t("lookups.added.manufacturer"), TOAST_OPTIONS);
    } catch (error) {
      console.error("Error adding manufacturer:", error);
      toast.error(t("lookups.addError.manufacturer"), TOAST_OPTIONS);
    }
  };

  const handleAddSeries = async () => {
    const name = seriesName.trim();
    if (!name) return;
    try {
      await createSeries.mutateAsync({ name, manufacturer: seriesManufacturer?.name ?? null });
      setSeriesName("");
      setSeriesManufacturer(null);
      void refreshUsage();
      toast.success(t("lookups.added.series"), TOAST_OPTIONS);
    } catch (error) {
      console.error("Error adding series:", error);
      toast.error(t("lookups.addError.series"), TOAST_OPTIONS);
    }
  };

  const handleAddVehicleType = async () => {
    const name = vtName.trim();
    if (!name) return;
    try {
      await createVehicleType.mutateAsync(name);
      setVtName("");
      void refreshUsage();
      toast.success(t("lookups.added.vehicleType"), TOAST_OPTIONS);
    } catch (error) {
      console.error("Error adding vehicle type:", error);
      toast.error(t("lookups.addError.vehicleType"), TOAST_OPTIONS);
    }
  };

  const handleAddColor = async () => {
    const name = colorName.trim();
    if (!name) return;
    try {
      await createColor.mutateAsync(name);
      setColorName("");
      void refreshUsage();
      toast.success(t("lookups.added.color"), TOAST_OPTIONS);
    } catch (error) {
      console.error("Error adding color:", error);
      toast.error(t("lookups.addError.color"), TOAST_OPTIONS);
    }
  };

  const handleAddTag = async () => {
    const name = tagName.trim();
    if (!name) return;
    try {
      await createTag.mutateAsync({ name, color: tagUseColor ? tagColor : null });
      setTagName("");
      setTagUseColor(false);
      void refreshUsage();
      toast.success(t("lookups.added.tag"), TOAST_OPTIONS);
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error(t("lookups.addError.tag"), TOAST_OPTIONS);
    }
  };

  return (
    <Page
      crumbs={[{ label: t("settings.title"), to: "/settings" }, { label: t("lookups.title") }]}
      toolbar={<SettingsToolbar />}
    >
      <Stack spacing={2} sx={{ maxWidth: 980 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tab}
            onChange={(_, v: number) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {TABS.map((item, index) => (
              <Tab
                key={item.key}
                label={t(item.labelKey)}
                id={`lookups-tab-${index}`}
                aria-controls={`lookups-tabpanel-${index}`}
              />
            ))}
          </Tabs>
        </Box>

        <TabPanel value={tab} index={0}>
          <LookupSection
            kind="manufacturers"
            usage={usage?.manufacturers}
            title={t("lookups.tabs.manufacturers")}
            items={(manufacturers ?? []).map((m) => ({ id: m.id, label: m.name }))}
            isLoading={mfrsLoading}
            onDelete={(id) => void handleDelete(() => deleteManufacturer.mutateAsync(id))}
          >
            <SimpleAddForm
              label={t("lookups.manufacturerName")}
              value={mfrName}
              onChange={setMfrName}
              onAdd={() => void handleAddManufacturer()}
            />
          </LookupSection>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <LookupSection
            kind="series"
            usage={usage?.series}
            title={t("lookups.tabs.series")}
            items={(allSeries ?? []).map((s) => ({
              id: s.id,
              label: s.name,
              secondary: s.manufacturerName ?? undefined,
              group: s.manufacturerId,
            }))}
            isLoading={seriesLoading}
            onDelete={(id) => void handleDelete(() => deleteSeries.mutateAsync(id))}
          >
            <Stack
              component="form"
              spacing={1}
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void handleAddSeries();
              }}
              flexWrap="wrap"
              useFlexGap
              direction="row"
            >
              <TextField
                label={t("lookups.seriesName")}
                size="small"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                sx={{ minWidth: 220 }}
              />
              <AutocompleteSelect<NamedLookup>
                label={t("lookups.seriesManufacturer")}
                options={manufacturers ?? []}
                value={seriesManufacturer}
                getOptionLabel={(opt) => opt.name}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                onChange={(val) => setSeriesManufacturer(val)}
                sx={{ minWidth: 220 }}
                size="small"
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<AddIcon />}
                disabled={!seriesName.trim()}
              >
                {t("common.add")}
              </Button>
            </Stack>
          </LookupSection>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <LookupSection
            kind="vehicle-types"
            usage={usage?.vehicleTypes}
            title={t("lookups.tabs.vehicleTypes")}
            items={(vehicleTypes ?? []).map((v) => ({ id: v.id, label: v.name }))}
            isLoading={vtLoading}
            onDelete={(id) => void handleDelete(() => deleteVehicleType.mutateAsync(id))}
          >
            <SimpleAddForm
              label={t("lookups.vehicleTypeName")}
              value={vtName}
              onChange={setVtName}
              onAdd={() => void handleAddVehicleType()}
            />
          </LookupSection>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <LookupSection
            kind="colors"
            usage={usage?.colors}
            title={t("lookups.tabs.colors")}
            items={(colors ?? []).map((c) => ({ id: c.id, label: c.name }))}
            isLoading={colorsLoading}
            onDelete={(id) => void handleDelete(() => deleteColor.mutateAsync(id))}
          >
            <SimpleAddForm
              label={t("lookups.colorName")}
              value={colorName}
              onChange={setColorName}
              onAdd={() => void handleAddColor()}
            />
          </LookupSection>
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <LookupSection
            kind="tags"
            usage={usage?.tags}
            title={t("lookups.tabs.tags")}
            items={(tags ?? []).map((tag) => ({ id: tag.id, label: tag.name, color: tag.color }))}
            isLoading={tagsLoading}
            onDelete={(id) => void handleDelete(() => deleteTag.mutateAsync(id))}
          >
            <Stack
              component="form"
              spacing={1}
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void handleAddTag();
              }}
              flexWrap="wrap"
              useFlexGap
              direction="row"
              alignItems="center"
            >
              <TextField
                label={t("lookups.tagName")}
                size="small"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                sx={{ minWidth: 220 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={tagUseColor}
                    onChange={(e) => setTagUseColor(e.target.checked)}
                    size="small"
                  />
                }
                label={t("lookups.customColor")}
              />
              {tagUseColor && (
                <Box
                  component="input"
                  type="color"
                  value={tagColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagColor(e.target.value)}
                  aria-label={t("lookups.tagColor")}
                  sx={{
                    width: 40,
                    height: 36,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 0.5,
                    bgcolor: "transparent",
                  }}
                />
              )}
              <Button
                type="submit"
                variant="contained"
                startIcon={<AddIcon />}
                disabled={!tagName.trim()}
              >
                {t("common.add")}
              </Button>
            </Stack>
          </LookupSection>
        </TabPanel>
      </Stack>
    </Page>
  );
};

export default LookupsPage;
