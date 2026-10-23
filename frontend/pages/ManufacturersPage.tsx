import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { ManufacturerOverview } from "../api/lookups";
import CollectionListToolbar, {
  ListSearchField,
  type FilterField,
  type ListView,
} from "../components/CollectionListToolbar";
import { CardGrid, EmptyState, ItemTable, type TableColumn } from "../components/ListViews";
import ManufacturerLogo from "../components/ManufacturerLogo";
import Page from "../components/Page";
import { byValue } from "../hooks/useIdFilter";
import { useLocalPreference } from "../hooks/useLocalPreference";
import { useManufacturerOverview } from "../hooks/useLookups";
import { useSessionState } from "../hooks/useSessionState";
import {
  browseCompare,
  browseSortOptions,
  CONTENTS_OPTIONS,
  keepContents,
  matchesSearch,
  type BrowseSort,
  type ContentsFilter,
} from "../utils/browse";

// Collection → Manufacturers: logo cards or a table, with search, sort and a filter on what
// each one has in the collection. Opening one shows all of its cars and sets.
const ManufacturersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: manufacturers, isLoading } = useManufacturerOverview();

  const [search, setSearch] = useSessionState("manufacturers.search", "");
  const [sort, setSort] = useSessionState<BrowseSort>("manufacturers.sort", "vehicles_desc");
  const [contents, setContents] = useSessionState<ContentsFilter[]>("manufacturers.contents", []);
  const [contentsExclude, setContentsExclude] = useSessionState(
    "manufacturers.contentsExclude",
    false
  );
  const [view, setView] = useLocalPreference<ListView>("manufacturers.view", "cards");
  const [cardSize, setCardSize] = useLocalPreference("manufacturers.cardSize", 220);

  const visible = useMemo(
    () =>
      (manufacturers ?? [])
        .filter(
          (item) =>
            matchesSearch(search, item.name) && keepContents(item, contents, contentsExclude)
        )
        .sort(browseCompare(sort)),
    [manufacturers, search, contents, contentsExclude, sort]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: FilterField<any>[] = [
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
  const filtering = contents.length > 0 || search.trim() !== "";

  const counts = (item: ManufacturerOverview) =>
    `${t("common.vehicleCount", { count: item.carCount })} · ${t("common.setCount", { count: item.setCount })}`;

  const columns: TableColumn<ManufacturerOverview>[] = [
    { key: "name", label: t("common.name"), render: (item) => item.name },
    { key: "vehicles", label: t("nav.vehicles"), render: (item) => item.carCount, align: "right" },
    { key: "sets", label: t("nav.sets"), render: (item) => item.setCount, align: "right" },
  ];

  return (
    <Page
      crumbs={[{ label: t("nav.collection") }, { label: t("manufacturers.title") }]}
      meta={manufacturers ? String(visible.length) : null}
      actions={
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder={t("browse.searchManufacturers")}
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
          onClearFilters={() => {
            setContents([]);
            setContentsExclude(false);
          }}
          sortOptions={browseSortOptions(t, false)}
          sort={sort}
          onSortChange={(value) => setSort(value as BrowseSort)}
          visibleCount={visible.length}
        />
      }
    >
      {isLoading ? (
        <EmptyState>{t("common.loading")}</EmptyState>
      ) : !visible.length ? (
        <EmptyState>{filtering ? t("listToolbar.noMatch") : t("manufacturers.none")}</EmptyState>
      ) : view === "table" ? (
        <ItemTable
          items={visible}
          getKey={(item) => item.id}
          columns={columns}
          onOpen={(item) => navigate(`/collection/manufacturers/${item.id}`)}
          selectable={false}
          isSelected={() => false}
          onToggle={() => undefined}
        />
      ) : (
        <CardGrid size={cardSize}>
          {visible.map((manufacturer) => (
            <Box
              key={manufacturer.id}
              component={Link}
              to={`/collection/manufacturers/${manufacturer.id}`}
              sx={{
                display: "block",
                color: "inherit",
                textDecoration: "none",
                "&:hover .logo": { outlineColor: "dct.borderStrong" },
              }}
            >
              <Box
                className="logo"
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  outline: 1,
                  outlineStyle: "solid",
                  outlineColor: "dct.border",
                  outlineOffset: "-1px",
                }}
              >
                <ManufacturerLogo name={manufacturer.name} height={Math.round(cardSize * 0.5)} />
              </Box>
              <Typography variant="subtitle2" noWrap sx={{ mt: 0.875, fontSize: 13.5 }}>
                {manufacturer.name}
              </Typography>
              <Typography variant="caption" component="div" noWrap sx={{ color: "dct.text3" }}>
                {counts(manufacturer)}
              </Typography>
            </Box>
          ))}
        </CardGrid>
      )}
    </Page>
  );
};

export default ManufacturersPage;
