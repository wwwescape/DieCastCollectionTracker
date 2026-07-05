import { useState, type FormEvent } from "react";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { AxiosError } from "axios";
import { toast } from "react-toastify";
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
  useManufacturers,
  useSeries,
  useVehicleTypes,
} from "../hooks/useLookups";
import { useCreateTag, useDeleteTag, useTags } from "../hooks/useTags";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import LookupSection from "../components/LookupSection";
import AutocompleteSelect from "../components/AutocompleteSelect";
import DataManagementSection from "../components/DataManagementSection";
import type { NamedLookup } from "../api/types";

function getDeleteErrorMessage(error: unknown): string {
  const ae = error as AxiosError<{ detail: string }>;
  if (ae.response?.status === 409) {
    return ae.response.data?.detail ?? "Item is still in use by a car.";
  }
  return "Error deleting item. Please try again.";
}

interface SimpleAddFormProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}

function SimpleAddForm({ label, value, onChange, onAdd }: SimpleAddFormProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd();
  };

  return (
    <Stack component="form" direction="row" spacing={1} onSubmit={handleSubmit} flexWrap="wrap" useFlexGap>
      <TextField
        label={label}
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ minWidth: 220 }}
      />
      <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={!value.trim()}>
        Add
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
    <Box role="tabpanel" hidden={value !== index} id={`manage-tabpanel-${index}`} aria-labelledby={`manage-tab-${index}`}>
      {value === index && children}
    </Box>
  );
}

const ManagePage = () => {
  const [tab, setTab] = useState(0);

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
  const [tagColor, setTagColor] = useState("#e10600");

  const handleDelete = async (fn: () => Promise<void>) => {
    try {
      await fn();
      toast.success("Deleted.", TOAST_OPTIONS);
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(getDeleteErrorMessage(error), TOAST_OPTIONS);
    }
  };

  const handleAddManufacturer = async () => {
    const name = mfrName.trim();
    if (!name) return;
    try {
      await createManufacturer.mutateAsync(name);
      setMfrName("");
      toast.success("Manufacturer added.", TOAST_OPTIONS);
    } catch (error) {
      console.error("Error adding manufacturer:", error);
      toast.error("Error adding manufacturer. Please try again.", TOAST_OPTIONS);
    }
  };

  const handleAddSeries = async () => {
    const name = seriesName.trim();
    if (!name) return;
    try {
      await createSeries.mutateAsync({ name, manufacturer: seriesManufacturer?.name ?? null });
      setSeriesName("");
      setSeriesManufacturer(null);
      toast.success("Series added.", TOAST_OPTIONS);
    } catch (error) {
      console.error("Error adding series:", error);
      toast.error("Error adding series. Please try again.", TOAST_OPTIONS);
    }
  };

  const handleAddVehicleType = async () => {
    const name = vtName.trim();
    if (!name) return;
    try {
      await createVehicleType.mutateAsync(name);
      setVtName("");
      toast.success("Vehicle type added.", TOAST_OPTIONS);
    } catch (error) {
      console.error("Error adding vehicle type:", error);
      toast.error("Error adding vehicle type. Please try again.", TOAST_OPTIONS);
    }
  };

  const handleAddColor = async () => {
    const name = colorName.trim();
    if (!name) return;
    try {
      await createColor.mutateAsync(name);
      setColorName("");
      toast.success("Color added.", TOAST_OPTIONS);
    } catch (error) {
      console.error("Error adding color:", error);
      toast.error("Error adding color. Please try again.", TOAST_OPTIONS);
    }
  };

  const handleAddTag = async () => {
    const name = tagName.trim();
    if (!name) return;
    try {
      await createTag.mutateAsync({ name, color: tagUseColor ? tagColor : null });
      setTagName("");
      setTagUseColor(false);
      toast.success("Tag added.", TOAST_OPTIONS);
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error("Error adding tag. Please try again.", TOAST_OPTIONS);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">
        Manage Lookups
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Manufacturers" id="manage-tab-0" aria-controls="manage-tabpanel-0" />
          <Tab label="Series" id="manage-tab-1" aria-controls="manage-tabpanel-1" />
          <Tab label="Vehicle Types" id="manage-tab-2" aria-controls="manage-tabpanel-2" />
          <Tab label="Colors" id="manage-tab-3" aria-controls="manage-tabpanel-3" />
          <Tab label="Tags" id="manage-tab-4" aria-controls="manage-tabpanel-4" />
          <Tab label="Data" id="manage-tab-5" aria-controls="manage-tabpanel-5" />
        </Tabs>
      </Box>

      <TabPanel value={tab} index={0}>
        <LookupSection
          title="Manufacturers"
          items={(manufacturers ?? []).map((m) => ({ id: m.id, label: m.name }))}
          isLoading={mfrsLoading}
          onDelete={(id) => void handleDelete(() => deleteManufacturer.mutateAsync(id))}
        >
          <SimpleAddForm
            label="Manufacturer name"
            value={mfrName}
            onChange={setMfrName}
            onAdd={() => void handleAddManufacturer()}
          />
        </LookupSection>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <LookupSection
          title="Series"
          items={(allSeries ?? []).map((s) => ({
            id: s.id,
            label: s.name,
            secondary: s.manufacturerName ?? undefined,
          }))}
          isLoading={seriesLoading}
          onDelete={(id) => void handleDelete(() => deleteSeries.mutateAsync(id))}
        >
          <Stack component="form" spacing={1} onSubmit={(e: FormEvent) => { e.preventDefault(); void handleAddSeries(); }} flexWrap="wrap" useFlexGap direction="row">
            <TextField
              label="Series name"
              size="small"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <AutocompleteSelect<NamedLookup>
              label="Manufacturer (optional)"
              options={manufacturers ?? []}
              value={seriesManufacturer}
              getOptionLabel={(opt) => opt.name}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              onChange={(val) => setSeriesManufacturer(val)}
              sx={{ minWidth: 220 }}
              size="small"
            />
            <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={!seriesName.trim()}>
              Add
            </Button>
          </Stack>
        </LookupSection>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <LookupSection
          title="Vehicle Types"
          items={(vehicleTypes ?? []).map((v) => ({ id: v.id, label: v.name }))}
          isLoading={vtLoading}
          onDelete={(id) => void handleDelete(() => deleteVehicleType.mutateAsync(id))}
        >
          <SimpleAddForm
            label="Vehicle type name"
            value={vtName}
            onChange={setVtName}
            onAdd={() => void handleAddVehicleType()}
          />
        </LookupSection>
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <LookupSection
          title="Colors"
          items={(colors ?? []).map((c) => ({ id: c.id, label: c.name }))}
          isLoading={colorsLoading}
          onDelete={(id) => void handleDelete(() => deleteColor.mutateAsync(id))}
        >
          <SimpleAddForm
            label="Color name"
            value={colorName}
            onChange={setColorName}
            onAdd={() => void handleAddColor()}
          />
        </LookupSection>
      </TabPanel>

      <TabPanel value={tab} index={4}>
        <LookupSection
          title="Tags"
          items={(tags ?? []).map((t) => ({ id: t.id, label: t.name, color: t.color }))}
          isLoading={tagsLoading}
          onDelete={(id) => void handleDelete(() => deleteTag.mutateAsync(id))}
        >
          <Stack component="form" spacing={1} onSubmit={(e: FormEvent) => { e.preventDefault(); void handleAddTag(); }} flexWrap="wrap" useFlexGap direction="row" alignItems="center">
            <TextField
              label="Tag name"
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
              label="Custom color"
            />
            {tagUseColor && (
              <Box
                component="input"
                type="color"
                value={tagColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagColor(e.target.value)}
                aria-label="Tag color"
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
            <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={!tagName.trim()}>
              Add
            </Button>
          </Stack>
        </LookupSection>
      </TabPanel>
      <TabPanel value={tab} index={5}>
        <DataManagementSection />
      </TabPanel>
    </Stack>
  );
};

export default ManagePage;
