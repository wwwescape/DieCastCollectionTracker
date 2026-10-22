import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import type { ItemSource } from "../api/listFilters";
import type { SealedState, SetListParams } from "../api/sets";
import {
  CAR_CONDITIONS,
  SET_TYPES,
  type CarCondition,
  type CarStatus,
  type NamedLookup,
  type SetType,
} from "../api/types";
import { useCollectionBulkActions } from "../hooks/useCollectionBulkActions";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import {
  byId,
  byValue,
  listOrUndefined,
  pickedOptions,
  seriesOptionLabel,
  useIdFilter,
} from "../hooks/useIdFilter";
import { useListSelection } from "../hooks/useListSelection";
import { useManufacturers, useSeries } from "../hooks/useLookups";
import { useSessionState } from "../hooks/useSessionState";
import { useSetList } from "../hooks/useSets";
import { useTags } from "../hooks/useTags";
import { DEFAULT_SORT, listSortOptions, splitSort } from "../utils/listSort";
import CollectionListToolbar, { type FilterField } from "./CollectionListToolbar";
import CollectionSubNav from "./CollectionSubNav";
import SetCard from "./SetCard";
import VirtualCarGrid from "./VirtualCarGrid";

const STATUSES: CarStatus[] = ["owned", "wishlist"];
const SEALED_STATES: SealedState[] = ["sealed", "opened"];
const SOURCES: ItemSource[] = ["wiki", "custom"];
const MIN_SEARCH_LENGTH = 2;

// The Sets list: same toolbar, filters, sort and bulk actions as the Vehicles list (see
// CarList.tsx), with Type and Sealed in place of vehicle type and color.
const SetList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useSessionState("sets.search", "");
  const [statuses, setStatuses] = useSessionState<CarStatus[]>("sets.statuses", []);
  const [statusExclude, setStatusExclude] = useSessionState("sets.statusExclude", false);
  const [setTypes, setSetTypes] = useSessionState<SetType[]>("sets.setTypes", []);
  const [setTypeExclude, setSetTypeExclude] = useSessionState("sets.setTypeExclude", false);
  const [conditions, setConditions] = useSessionState<CarCondition[]>("sets.conditions", []);
  const [conditionExclude, setConditionExclude] = useSessionState("sets.conditionExclude", false);
  const [sealed, setSealed] = useSessionState<SealedState[]>("sets.sealed", []);
  const [sealedExclude, setSealedExclude] = useSessionState("sets.sealedExclude", false);
  const [sources, setSources] = useSessionState<ItemSource[]>("sets.sources", []);
  const [sourceExclude, setSourceExclude] = useSessionState("sets.sourceExclude", false);
  const [tagMatchAll, setTagMatchAll] = useSessionState("sets.tagMatchAll", false);
  const [sort, setSort] = useSessionState("sets.sort", DEFAULT_SORT);

  const { data: manufacturers, isSuccess: manufacturersLoaded } = useManufacturers();
  const { data: series, isSuccess: seriesLoaded } = useSeries();
  const { data: tags, isSuccess: tagsLoaded } = useTags();
  const manufacturer = useIdFilter("sets", "manufacturer", manufacturers, manufacturersLoaded);
  const seriesFilter = useIdFilter("sets", "series", series, seriesLoaded);
  const tag = useIdFilter("sets", "tag", tags, tagsLoaded);

  const trimmed = search.trim();
  const debounced = useDebouncedValue(trimmed, 400);
  const params = useMemo<SetListParams>(
    () => ({
      search: debounced.length >= MIN_SEARCH_LENGTH ? debounced : undefined,
      status: listOrUndefined(statuses),
      statusExclude,
      setType: listOrUndefined(setTypes),
      setTypeExclude,
      manufacturerId: listOrUndefined(manufacturer.ids),
      manufacturerExclude: manufacturer.exclude,
      seriesId: listOrUndefined(seriesFilter.ids),
      seriesExclude: seriesFilter.exclude,
      condition: listOrUndefined(conditions),
      conditionExclude,
      sealed: listOrUndefined(sealed),
      sealedExclude,
      tagId: listOrUndefined(tag.ids),
      tagExclude: tag.exclude,
      tagMatchAll,
      source: listOrUndefined(sources),
      sourceExclude,
      ...splitSort(sort),
    }),
    [
      debounced,
      statuses,
      statusExclude,
      setTypes,
      setTypeExclude,
      manufacturer.ids,
      manufacturer.exclude,
      seriesFilter.ids,
      seriesFilter.exclude,
      conditions,
      conditionExclude,
      sealed,
      sealedExclude,
      tag.ids,
      tag.exclude,
      tagMatchAll,
      sources,
      sourceExclude,
      sort,
    ]
  );
  const { data: sets, isLoading, isFetching } = useSetList(params);
  const visible = useMemo(() => sets ?? [], [sets]);
  const selection = useListSelection(visible);
  const bulk = useCollectionBulkActions("sets", selection.selectedIds, selection.exit);

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
      key: "setType",
      label: t("common.type"),
      options: SET_TYPES,
      selected: setTypes,
      onChange: setSetTypes,
      getOptionLabel: (option: SetType) => t(`setTypes.${option}`),
      isOptionEqualToValue: byValue,
      exclude: setTypeExclude,
      onExcludeChange: setSetTypeExclude,
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
      key: "sealed",
      label: t("listToolbar.sealedState"),
      options: SEALED_STATES,
      selected: sealed,
      onChange: setSealed,
      getOptionLabel: (option: SealedState) =>
        option === "sealed" ? t("sets.sealed") : t("sets.opened"),
      isOptionEqualToValue: byValue,
      exclude: sealedExclude,
      onExcludeChange: setSealedExclude,
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
    setSetTypes([]);
    setSetTypeExclude(false);
    setConditions([]);
    setConditionExclude(false);
    setSealed([]);
    setSealedExclude(false);
    setSources([]);
    setSourceExclude(false);
    setTagMatchAll(false);
    for (const filter of [manufacturer, seriesFilter, tag]) {
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
              {t("sets.title")}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/collection/sets/add")}
            >
              {t("sets.addSet")}
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
            selectLabel={t("listToolbar.selectSets")}
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
      <Box sx={{ isolation: "isolate" }}>
        {isLoading || (searching && trimmed !== debounced) || (isFetching && !sets) ? (
          <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>
        ) : visible.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: "center" }}>
            {filtering || searching ? t("listToolbar.noMatch") : t("sets.noneFound")}
          </Paper>
        ) : (
          <VirtualCarGrid
            items={visible}
            getKey={(set) => set.id}
            renderItem={(set) => (
              <SetCard
                set={set}
                onClick={() => navigate(`/collection/sets/${set.id}/edit`)}
                selectable={selection.selectionMode}
                selected={selection.isSelected(set.id)}
                onToggleSelect={() => selection.toggle(set.id)}
              />
            )}
          />
        )}
      </Box>
      {bulk.dialogs}
    </>
  );
};

export default SetList;
