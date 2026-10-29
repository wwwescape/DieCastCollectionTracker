import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { useTranslation } from "react-i18next";
import { resolveThumbnailUrl } from "../api/client";
import type { CarListParams } from "../api/cars";
import type { ItemSource } from "../api/listFilters";
import {
  CAR_CONDITIONS,
  type Car,
  type CarCondition,
  type CarStatus,
  type NamedLookup,
} from "../api/types";
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
import { useLocalPreference } from "../hooks/useLocalPreference";
import { useSessionState } from "../hooks/useSessionState";
import { useTags } from "../hooks/useTags";
import { ATTENTION_CHECKS, isAttentionKind, type AttentionKind } from "../utils/attention";
import { DEFAULT_SORT, listSortOptions, splitSort } from "../utils/listSort";
import { openedFrom } from "../utils/navState";
import CarCard from "./CarCard";
import CollectionListToolbar, {
  CARD_SIZE_DEFAULT,
  ListSearchField,
  type FilterField,
  type ListView,
} from "./CollectionListToolbar";
import { EmptyState, ItemTable, OverviewRows, PhotoGrid, type TableColumn } from "./ListViews";
import Page from "./Page";

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
  const [view, setView] = useLocalPreference<ListView>("vehicles.view", "photos");
  const [cardSize, setCardSize] = useLocalPreference("vehicles.cardSize", CARD_SIZE_DEFAULT);
  // The header search lands here with its text in route state; apply it even when this list
  // is already open (the session value is only read on mount).
  const location = useLocation();
  const routeState = location.state as {
    search?: string;
    attention?: string;
    wishlist?: boolean;
  } | null;
  // "Needs attention" on the Overview: a one-off filter shown as a removable chip.
  const [attention, setAttention] = useSessionState<AttentionKind | null>(
    "vehicles.attention",
    null
  );
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
  const visible = useMemo(
    () => (attention ? (cars ?? []).filter(ATTENTION_CHECKS[attention]) : (cars ?? [])),
    [cars, attention]
  );
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

  // Arrivals from the header search and the Overview. "Needs attention" and "View all" on the
  // wishlist start from a clean list, so filters remembered from earlier don't hide what the
  // Overview just counted.
  useEffect(() => {
    if (!routeState) return;
    if (typeof routeState.search === "string") setSearch(routeState.search);
    if (isAttentionKind(routeState.attention) || routeState.wishlist) {
      clearFilters();
      setSearch("");
      setAttention(isAttentionKind(routeState.attention) ? routeState.attention : null);
      if (routeState.wishlist) setStatuses(["wishlist"]);
    }
    // Used once: drop it from this history entry, so Back to the list doesn't re-apply a
    // search or filter cleared since.
    navigate(location.pathname + location.search, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeState]);

  const filtering = attention !== null || filters.some((filter) => filter.selected.length > 0);
  const searching = trimmed.length >= MIN_SEARCH_LENGTH;

  const open = (car: Car) =>
    navigate(`/collection/vehicles/${car.id}`, { state: openedFrom(location) });
  const columns: TableColumn<Car>[] = [
    { key: "name", label: t("common.name"), render: (car) => car.name },
    { key: "status", label: t("common.status"), render: (car) => t(`status.${car.status}`) },
    {
      key: "manufacturer",
      label: t("common.manufacturer"),
      render: (car) => car.manufacturerName,
      hideBelow: "md",
    },
    {
      key: "series",
      label: t("vehicles.series"),
      render: (car) => car.seriesName,
      hideBelow: "sm",
    },
    { key: "year", label: t("common.year"), render: (car) => car.year },
    {
      key: "toy",
      label: t("listToolbar.toyNumberShort"),
      render: (car) => car.castNumber,
      hideBelow: "lg",
    },
    {
      key: "col",
      label: t("listToolbar.collectionNumberShort"),
      render: (car) => car.collectionNumber,
      hideBelow: "lg",
    },
    { key: "color", label: t("common.color"), render: (car) => car.colorName, hideBelow: "lg" },
    {
      key: "condition",
      label: t("vehicles.condition"),
      render: (car) => (car.condition ? t(`conditions.${car.condition}`) : null),
      hideBelow: "md",
    },
    {
      key: "quantity",
      label: t("listToolbar.quantityShort"),
      render: (car) => car.quantity,
      align: "right",
    },
  ];
  const selectionProps = {
    selectable: selection.selectionMode,
    isSelected: selection.isSelected,
    onToggle: selection.toggle,
  };

  return (
    <Page
      crumbs={[{ label: t("nav.collection") }, { label: t("vehicles.title") }]}
      meta={cars ? t("common.vehicleCount", { count: visible.length }) : null}
      actions={
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            width: { xs: "100%", sm: "auto" },
          }}
        >
          {attention ? (
            <Chip
              label={t(`overview.attention.${attention}`)}
              onDelete={() => setAttention(null)}
              color="primary"
              variant="outlined"
            />
          ) : null}
          <ListSearchField value={search} onChange={setSearch} />
        </Box>
      }
      toolbar={
        <CollectionListToolbar
          addLabel={t("common.add")}
          addTo="/collection/vehicles/add"
          view={view}
          onViewChange={setView}
          cardSize={cardSize}
          onCardSizeChange={setCardSize}
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
      }
    >
      {isLoading || (searching && trimmed !== debounced) || (isFetching && !cars) ? (
        <EmptyState>{t("common.loading")}</EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState>
          {filtering || searching ? t("listToolbar.noMatch") : t("vehicles.noneFound")}
        </EmptyState>
      ) : view === "table" ? (
        <ItemTable
          items={visible}
          getKey={(car) => car.id}
          columns={columns}
          getPhoto={(car) => resolveThumbnailUrl(car.photo)}
          onOpen={open}
          {...selectionProps}
        />
      ) : view === "overview" ? (
        <OverviewRows
          items={visible}
          getKey={(car) => car.id}
          getPhoto={(car) => resolveThumbnailUrl(car.photo)}
          getRow={(car) => ({
            title: car.name,
            subtitle: [car.manufacturerName, car.seriesName, car.year].filter(Boolean).join(" · "),
            chips: [
              car.castNumber,
              car.collectionNumber ? `#${car.collectionNumber}` : null,
              car.colorName,
              car.vehicleTypeName,
              car.condition ? t(`conditions.${car.condition}`) : null,
              ...car.tags.map((tag) => tag.name),
            ].filter((chip): chip is string => Boolean(chip)),
            status: car.status,
            quantity: car.quantity,
          })}
          onOpen={open}
          {...selectionProps}
        />
      ) : (
        <PhotoGrid
          items={visible}
          getKey={(car) => car.id}
          getName={(car) => car.name}
          cardSize={cardSize}
          showRail={sort === "name_asc"}
          renderItem={(car) => (
            <CarCard
              car={car}
              onClick={() => open(car)}
              selectable={selection.selectionMode}
              selected={selection.isSelected(car.id)}
              onToggleSelect={() => selection.toggle(car.id)}
            />
          )}
        />
      )}
      {bulk.dialogs}
    </Page>
  );
};

export default CarList;
