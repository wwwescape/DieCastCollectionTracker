import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resolveThumbnailUrl } from "../api/client";
import type { SeriesOverview } from "../api/lookups";
import CollectionListToolbar, {
  CARD_SIZE_DEFAULT,
  ListSearchField,
  type FilterField,
  type ListView,
} from "../components/CollectionListToolbar";
import ItemCard from "../components/ItemCard";
import { CardGrid, EmptyState, ItemTable, type TableColumn } from "../components/ListViews";
import Page from "../components/Page";
import { useCarList } from "../hooks/useCars";
import { byValue } from "../hooks/useIdFilter";
import { useLocalPreference } from "../hooks/useLocalPreference";
import { useSeriesOverview } from "../hooks/useLookups";
import { useSessionState } from "../hooks/useSessionState";
import {
  browseCompare,
  browseSortOptions,
  CONTENTS_OPTIONS,
  keep,
  keepContents,
  matchesSearch,
  type BrowseSort,
  type ContentsFilter,
} from "../utils/browse";
import { seriesPath, seriesSubtitle } from "../utils/series";

const NO_YEAR = "none";

// Collection → Series: one entry per series and year. Cards (with a cover photo from one of
// its vehicles) or a table, with search, sort and filters like the Vehicles list.
const SeriesListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: series, isLoading } = useSeriesOverview();
  const { data: cars } = useCarList();

  const [search, setSearch] = useSessionState("series.search", "");
  const [sort, setSort] = useSessionState<BrowseSort>("series.sort", "name_asc");
  const [manufacturers, setManufacturers] = useSessionState<string[]>("series.manufacturers", []);
  const [manufacturerExclude, setManufacturerExclude] = useSessionState(
    "series.manufacturerExclude",
    false
  );
  const [years, setYears] = useSessionState<string[]>("series.years", []);
  const [yearExclude, setYearExclude] = useSessionState("series.yearExclude", false);
  const [contents, setContents] = useSessionState<ContentsFilter[]>("series.contents", []);
  const [contentsExclude, setContentsExclude] = useSessionState("series.contentsExclude", false);
  const [view, setView] = useLocalPreference<ListView>("series.view", "cards");
  const [cardSize, setCardSize] = useLocalPreference("series.cardSize", CARD_SIZE_DEFAULT);

  const yearKey = (item: SeriesOverview) => (item.year === null ? NO_YEAR : String(item.year));

  // A cover for each series-and-year: the first of its vehicles with a photo.
  const covers = useMemo(() => {
    const map = new Map<string, string>();
    for (const car of cars ?? []) {
      const key = `${car.seriesId}:${car.year ?? NO_YEAR}`;
      if (car.photo && !map.has(key)) map.set(key, car.photo);
    }
    return map;
  }, [cars]);
  const coverOf = (item: SeriesOverview) =>
    resolveThumbnailUrl(covers.get(`${item.id}:${yearKey(item)}`) ?? null);

  const manufacturerOptions = useMemo(
    () =>
      [...new Set((series ?? []).map((item) => item.manufacturerName ?? ""))]
        .filter(Boolean)
        .sort(),
    [series]
  );
  const yearOptions = useMemo(
    () =>
      [...new Set((series ?? []).map(yearKey))].sort((a, b) =>
        a === NO_YEAR ? 1 : b === NO_YEAR ? -1 : Number(b) - Number(a)
      ),
    [series]
  );

  const visible = useMemo(
    () =>
      (series ?? [])
        .filter(
          (item) =>
            matchesSearch(search, item.name, item.manufacturerName, item.year) &&
            keep(item.manufacturerName ?? "", manufacturers, manufacturerExclude) &&
            keep(yearKey(item), years, yearExclude) &&
            keepContents(item, contents, contentsExclude)
        )
        .sort(browseCompare(sort)),
    [
      series,
      search,
      manufacturers,
      manufacturerExclude,
      years,
      yearExclude,
      contents,
      contentsExclude,
      sort,
    ]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: FilterField<any>[] = [
    {
      key: "manufacturer",
      label: t("common.manufacturer"),
      options: manufacturerOptions,
      selected: manufacturers,
      onChange: setManufacturers,
      getOptionLabel: (option: string) => option,
      isOptionEqualToValue: byValue,
      exclude: manufacturerExclude,
      onExcludeChange: setManufacturerExclude,
    },
    {
      key: "year",
      label: t("common.year"),
      options: yearOptions,
      selected: years,
      onChange: setYears,
      getOptionLabel: (option: string) => (option === NO_YEAR ? t("browse.noYear") : option),
      isOptionEqualToValue: byValue,
      exclude: yearExclude,
      onExcludeChange: setYearExclude,
    },
    {
      key: "contents",
      label: t("browse.contents"),
      options: CONTENTS_OPTIONS,
      selected: contents,
      onChange: setContents,
      getOptionLabel: (option: ContentsFilter) => t(`browse.has.${option}`),
      isOptionEqualToValue: byValue,
      exclude: contentsExclude,
      onExcludeChange: setContentsExclude,
    },
  ];
  const clearFilters = () => {
    setManufacturers([]);
    setManufacturerExclude(false);
    setYears([]);
    setYearExclude(false);
    setContents([]);
    setContentsExclude(false);
  };
  const filtering = filters.some((field) => field.selected.length > 0) || search.trim() !== "";

  const counts = (item: SeriesOverview) =>
    `${t("common.vehicleCount", { count: item.carCount })} · ${t("common.setCount", { count: item.setCount })}`;

  const columns: TableColumn<SeriesOverview>[] = [
    { key: "name", label: t("common.name"), render: (item) => item.name },
    { key: "year", label: t("common.year"), render: (item) => item.year },
    {
      key: "manufacturer",
      label: t("common.manufacturer"),
      render: (item) => item.manufacturerName,
      hideBelow: "sm",
    },
    { key: "vehicles", label: t("nav.vehicles"), render: (item) => item.carCount, align: "right" },
    { key: "sets", label: t("nav.sets"), render: (item) => item.setCount, align: "right" },
  ];

  return (
    <Page
      crumbs={[{ label: t("nav.collection") }, { label: t("seriesPage.title") }]}
      meta={series ? String(visible.length) : null}
      actions={
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder={t("browse.searchSeries")}
        />
      }
      toolbar={
        <CollectionListToolbar
          views={["cards", "table"]}
          view={view}
          onViewChange={setView}
          cardSize={cardSize}
          onCardSizeChange={setCardSize}
          filters={filters}
          onClearFilters={clearFilters}
          sortOptions={browseSortOptions(t, true)}
          sort={sort}
          onSortChange={(value) => setSort(value as BrowseSort)}
          visibleCount={visible.length}
        />
      }
    >
      {isLoading ? (
        <EmptyState>{t("common.loading")}</EmptyState>
      ) : !series?.length ? (
        <EmptyState>{t("seriesPage.none")}</EmptyState>
      ) : !visible.length ? (
        <EmptyState>{filtering ? t("listToolbar.noMatch") : t("seriesPage.none")}</EmptyState>
      ) : view === "table" ? (
        <ItemTable
          items={visible}
          // Ids repeat across years, so the key combines both.
          getKey={(item) => item.id * 10000 + (item.year ?? 0)}
          columns={columns}
          onOpen={(item) => navigate(seriesPath(item))}
          selectable={false}
          isSelected={() => false}
          onToggle={() => undefined}
        />
      ) : (
        <CardGrid size={cardSize}>
          {visible.map((item) => (
            <ItemCard
              key={`${item.id}-${item.year}`}
              title={item.name}
              subtitle={seriesSubtitle(item) || null}
              detail={counts(item)}
              imageUrl={coverOf(item)}
              onClick={() => navigate(seriesPath(item))}
            />
          ))}
        </CardGrid>
      )}
    </Page>
  );
};

export default SeriesListPage;
