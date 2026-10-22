import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import type { CarListParams } from "../api/cars";
import type { ItemSource } from "../api/listFilters";
import { CAR_CONDITIONS, type CarCondition, type CarStatus, type NamedLookup } from "../api/types";
import { useCarList } from "../hooks/useCars";
import { useCollectionBulkActions } from "../hooks/useCollectionBulkActions";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useListSelection } from "../hooks/useListSelection";
import { useColors, useManufacturers, useSeries, useVehicleTypes } from "../hooks/useLookups";
import {
  byId,
  byValue,
  listOrUndefined,
  pickedOptions,
  seriesOptionLabel,
  useIdFilter,
} from "../hooks/useIdFilter";
import { useSessionState } from "../hooks/useSessionState";
import { useTags } from "../hooks/useTags";
import { DEFAULT_SORT, listSortOptions, splitSort } from "../utils/listSort";
import CarCard from "./CarCard";
import CollectionListToolbar, { type FilterField } from "./CollectionListToolbar";
import CollectionSubNav from "./CollectionSubNav";
import VirtualCarGrid from "./VirtualCarGrid";

const STATUSES: CarStatus[] = ["owned", "wishlist"];
const SOURCES: ItemSource[] = ["wiki", "custom"];
const MIN_SEARCH_LENGTH = 2;

// The Vehicles list, modelled on VideoGameTrackarr's Games page: search, a Filters & Sort
// dialog (every filter with Exclude, tags with Match any / all), and a selection mode with
// bulk Remove, Tags, Set status, Set condition and Set series. Filters and sort are
// remembered for the browser session.
const CarList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useSessionState("vehicles.search", "");
  const [statuses, setStatuses] = useSessionState<CarStatus[]>("vehicles.statuses", []);
  const [statusExclude, setStatusExclude] = useSessionState("vehicles.statusExclude", false);
  const [conditions, setConditions] = useSessionState<CarCondition[]>("vehicles.conditions", []);
  const [conditionExclude, setConditionExclude] = useSessionState(
    "vehicles.conditionExclude",
    false
  );
  const [sources, setSources] = useSessionState<ItemSource[]>("vehicles.sources", []);
  const [sourceExclude, setSourceExclude] = useSessionState("vehicles.sourceExclude", false);
  const [tagMatchAll, setTagMatchAll] = useSessionState("vehicles.tagMatchAll", false);
  const [sort, setSort] = useSessionState("vehicles.sort", DEFAULT_SORT);

  const { data: manufacturers, isSuccess: manufacturersLoaded } = useManufacturers();
  const { data: series, isSuccess: seriesLoaded } = useSeries();
  const { data: vehicleTypes, isSuccess: vehicleTypesLoaded } = useVehicleTypes();
  const { data: colors, isSuccess: colorsLoaded } = useColors();
  const { data: tags, isSuccess: tagsLoaded } = useTags();
  const manufacturer = useIdFilter("vehicles", "manufacturer", manufacturers, manufacturersLoaded);
  const seriesFilter = useIdFilter("vehicles", "series", series, seriesLoaded);
  const vehicleType = useIdFilter("vehicles", "vehicleType", vehicleTypes, vehicleTypesLoaded);
  const color = useIdFilter("vehicles", "color", colors, colorsLoaded);
  const tag = useIdFilter("vehicles", "tag", tags, tagsLoaded);

  const trimmed = search.trim();
  const debounced = useDebouncedValue(trimmed, 400);
  const params = useMemo<CarListParams>(() => {
    const list = listOrUndefined;
    return {
      search: debounced.length >= MIN_SEARCH_LENGTH ? debounced : undefined,
      status: list(statuses),
      statusExclude,
      manufacturerId: list(manufacturer.ids),
      manufacturerExclude: manufacturer.exclude,
      seriesId: list(seriesFilter.ids),
      seriesExclude: seriesFilter.exclude,
      vehicleTypeId: list(vehicleType.ids),
      vehicleTypeExclude: vehicleType.exclude,
      colorId: list(color.ids),
      colorExclude: color.exclude,
      condition: list(conditions),
      conditionExclude,
      tagId: list(tag.ids),
      tagExclude: tag.exclude,
      tagMatchAll,
      source: list(sources),
      sourceExclude,
      ...splitSort(sort),
    };
  }, [
    debounced,
    statuses,
    statusExclude,
    manufacturer.ids,
    manufacturer.exclude,
    seriesFilter.ids,
    seriesFilter.exclude,
    vehicleType.ids,
    vehicleType.exclude,
    color.ids,
    color.exclude,
    conditions,
    conditionExclude,
    tag.ids,
    tag.exclude,
    tagMatchAll,
    sources,
    sourceExclude,
    sort,
  ]);
  const { data: cars, isLoading, isFetching } = useCarList(params);
  const visible = useMemo(() => cars ?? [], [cars]);
  const selection = useListSelection(visible);
  const bulk = useCollectionBulkActions("vehicles", selection.selectedIds, selection.exit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: FilterField<any>[] = [
    {
      key: "status",
      label: t("common.status"),
      options: STATUSES,
      selected: statuses,
      onChange: setStatuses,
      getOptionLabel: (option: CarStatus) => t(`status.${option}`),
      isOptionEqualToValue: byValue,
      exclude: statusExclude,
      onExcludeChange: setStatusExclude,
    },
    {
      key: "manufacturer",
      label: t("common.manufacturer"),
      options: manufacturers ?? [],
      selected: pickedOptions(manufacturers, manufacturer.ids),
      onChange: (value: NamedLookup[]) => manufacturer.setIds(value.map((option) => option.id)),
      getOptionLabel: (option: NamedLookup) => option.name,
      isOptionEqualToValue: byId,
      exclude: manufacturer.exclude,
      onExcludeChange: manufacturer.setExclude,
    },
    {
      key: "series",
      label: t("vehicles.series"),
      options: series ?? [],
      selected: pickedOptions(series, seriesFilter.ids),
      onChange: (value: { id: number }[]) => seriesFilter.setIds(value.map((option) => option.id)),
      getOptionLabel: seriesOptionLabel,
      isOptionEqualToValue: byId,
      exclude: seriesFilter.exclude,
      onExcludeChange: seriesFilter.setExclude,
    },
    {
      key: "vehicleType",
      label: t("vehicles.vehicleType"),
      options: vehicleTypes ?? [],
      selected: pickedOptions(vehicleTypes, vehicleType.ids),
      onChange: (value: NamedLookup[]) => vehicleType.setIds(value.map((option) => option.id)),
      getOptionLabel: (option: NamedLookup) => option.name,
      isOptionEqualToValue: byId,
      exclude: vehicleType.exclude,
      onExcludeChange: vehicleType.setExclude,
    },
    {
      key: "color",
      label: t("common.color"),
      options: colors ?? [],
      selected: pickedOptions(colors, color.ids),
      onChange: (value: NamedLookup[]) => color.setIds(value.map((option) => option.id)),
      getOptionLabel: (option: NamedLookup) => option.name,
      isOptionEqualToValue: byId,
      exclude: color.exclude,
      onExcludeChange: color.setExclude,
    },
    {
      key: "condition",
      label: t("vehicles.condition"),
      options: CAR_CONDITIONS,
      selected: conditions,
      onChange: setConditions,
      getOptionLabel: (option: CarCondition) => t(`conditions.${option}`),
      isOptionEqualToValue: byValue,
      exclude: conditionExclude,
      onExcludeChange: setConditionExclude,
    },
    {
      key: "tags",
      label: t("common.tags"),
      options: tags ?? [],
      selected: pickedOptions(tags, tag.ids),
      onChange: (value: { id: number }[]) => tag.setIds(value.map((option) => option.id)),
      getOptionLabel: (option: { name: string }) => option.name,
      isOptionEqualToValue: byId,
      exclude: tag.exclude,
      onExcludeChange: tag.setExclude,
      matchAll: tagMatchAll,
      onMatchAllChange: setTagMatchAll,
    },
    {
      key: "source",
      label: t("listToolbar.source"),
      options: SOURCES,
      selected: sources,
      onChange: setSources,
      getOptionLabel: (option: ItemSource) =>
        option === "wiki" ? t("listToolbar.sourceWiki") : t("common.custom"),
      isOptionEqualToValue: byValue,
      exclude: sourceExclude,
      onExcludeChange: setSourceExclude,
    },
  ];

  const clearFilters = () => {
    setStatuses([]);
    setStatusExclude(false);
    setConditions([]);
    setConditionExclude(false);
    setSources([]);
    setSourceExclude(false);
    setTagMatchAll(false);
    for (const filter of [manufacturer, seriesFilter, vehicleType, color, tag]) {
      filter.setIds([]);
      filter.setExclude(false);
    }
  };

  const filtering = filters.some((filter) => filter.selected.length > 0);
  const searching = trimmed.length >= MIN_SEARCH_LENGTH;

  return (
    <>
      <Box
        sx={{
          position: "sticky",
          top: (theme) => theme.mixins.toolbar.minHeight,
          zIndex: 2,
          bgcolor: "background.default",
          pb: 2,
          mb: 2,
          boxShadow: "0 4px 8px -4px rgba(0, 0, 0, 0.2)",
        }}
      >
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
          <CollectionListToolbar
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onClearFilters={clearFilters}
            sortOptions={listSortOptions(t)}
            sort={sort}
            onSortChange={setSort}
            selectLabel={t("listToolbar.selectVehicles")}
            selectionMode={selection.selectionMode}
            selectedCount={selection.selectedIds.length}
            visibleCount={visible.length}
            allVisibleSelected={selection.allVisibleSelected}
            onEnterSelectionMode={selection.enter}
            onExitSelectionMode={selection.exit}
            onToggleSelectAll={selection.toggleAll}
            onBulkDelete={bulk.onBulkDelete}
            bulkActions={bulk.bulkActions}
          />
        </Stack>
      </Box>
      {/* Its own stacking context, so floating field labels in the grid can't paint over
          the sticky header (same fix as VideoGameTrackarr's Games page). */}
      <Box sx={{ isolation: "isolate" }}>
        {isLoading || (searching && trimmed !== debounced) || (isFetching && !cars) ? (
          <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>
        ) : visible.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: "center" }}>
            {filtering || searching ? t("listToolbar.noMatch") : t("vehicles.noneFound")}
          </Paper>
        ) : (
          <VirtualCarGrid
            items={visible}
            getKey={(car) => car.id}
            renderItem={(car) => (
              <CarCard
                car={car}
                onClick={() => navigate(`/collection/vehicles/${car.id}/edit`)}
                selectable={selection.selectionMode}
                selected={selection.isSelected(car.id)}
                onToggleSelect={() => selection.toggle(car.id)}
              />
            )}
          />
        )}
      </Box>
      {bulk.dialogs}
    </>
  );
};

export default CarList;
