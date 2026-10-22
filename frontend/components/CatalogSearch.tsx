import { useState } from "react";
import { isAxiosError } from "axios";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import SearchIcon from "@mui/icons-material/Search";
import { Trans, useTranslation } from "react-i18next";
import type { CatalogCastingSummary, CatalogSearchSource } from "../api/catalog";
import { MIN_CATALOG_SEARCH_LENGTH, useCatalogSearch } from "../hooks/useCatalog";
import { useCollectionIndex } from "../hooks/useCollectionIndex";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { CATALOG_SOURCE_LABELS, castingDisplayName } from "../utils/catalog";
import { hasCasting, hasSeries } from "../utils/collectionIndex";
import ItemCard from "./ItemCard";

const SOURCES: CatalogSearchSource[] = ["all", "hotwheels", "matchbox"];

interface CatalogSearchProps {
  initialQuery?: string;
  initialSource?: CatalogSearchSource;
  onSelect: (casting: CatalogCastingSummary, query: string) => void;
  onQueryChange?: (query: string, source: CatalogSearchSource) => void;
  // Multi-pack pages (Hot Wheels Wiki only) are offered next to castings unless turned off,
  // e.g. when matching one existing vehicle, where a whole pack makes no sense.
  includePacks?: boolean;
}

// Searches the Hot Wheels and Matchbox wikis by name or by the toy number printed on the card
// (e.g. HYW18). Results are casting pages, plus multi-packs marked with their size ("10-Pack");
// picking one moves on to its versions or the pack's cars. A casting you already have a version
// of, or a pack you already have cars from, is marked with the bottom-left "related" chip.
const CatalogSearch = ({
  initialQuery = "",
  initialSource = "all",
  onSelect,
  onQueryChange,
  includePacks = true,
}: CatalogSearchProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [source, setSource] = useState<CatalogSearchSource>(initialSource);
  const collection = useCollectionIndex();

  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 600);
  const isActive = debounced.length >= MIN_CATALOG_SEARCH_LENGTH;
  const { data: results, isFetching, error } = useCatalogSearch(isActive ? debounced : "", source);
  const isPendingDebounce = trimmed.length >= MIN_CATALOG_SEARCH_LENGTH && trimmed !== debounced;
  const isSearching = isPendingDebounce || (isActive && isFetching);
  const visibleResults = (results ?? []).filter((result) => includePacks || result.kind !== "pack");

  const errorMessage =
    error && isAxiosError(error) && error.response?.status === 502
      ? t("catalog.unreachable")
      : error
        ? t("common.searchFailed")
        : null;

  const update = (nextQuery: string, nextSource: CatalogSearchSource) => {
    setQuery(nextQuery);
    setSource(nextSource);
    onQueryChange?.(nextQuery, nextSource);
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: { sm: "center" } }}
        >
          <TextField
            label={t("catalog.searchLabel")}
            placeholder={t("catalog.searchPlaceholder")}
            fullWidth
            autoFocus
            value={query}
            onChange={(event) => update(event.target.value, source)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: isSearching ? (
                  <InputAdornment position="end">
                    <CircularProgress size={20} aria-label={t("common.searching")} />
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={source}
            onChange={(_event, value: CatalogSearchSource | null) => value && update(query, value)}
            aria-label={t("catalog.sourceLabel")}
            sx={{ flexShrink: 0 }}
          >
            {SOURCES.map((option) => (
              <ToggleButton key={option} value={option}>
                {option === "all"
                  ? t("common.all")
                  : CATALOG_SOURCE_LABELS[option].replace(" Wiki", "")}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
          <Trans
            i18nKey="catalog.attribution"
            components={{
              hw: (
                <Link
                  href="https://hotwheels.fandom.com"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
              mb: (
                <Link
                  href="https://matchbox.fandom.com"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
            }}
          />
        </Typography>
      </Paper>

      {errorMessage ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{errorMessage}</Paper>
      ) : !isActive ? (
        <Paper sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
          {t("common.minSearchLength", { count: MIN_CATALOG_SEARCH_LENGTH })}
        </Paper>
      ) : results && visibleResults.length === 0 && !isSearching ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("catalog.noResults")}</Paper>
      ) : (
        <Grid container spacing={2}>
          {visibleResults.map((result) => (
            <Grid key={`${result.source}:${result.title}`} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <ItemCard
                title={castingDisplayName(result.title)}
                imageUrl={result.thumbnailUrl}
                imageFit="contain"
                relatedHint={
                  result.kind === "pack"
                    ? hasSeries(collection, castingDisplayName(result.title))
                      ? t("catalog.pack.related")
                      : null
                    : hasCasting(collection, result.title)
                      ? t("catalog.relatedCasting")
                      : null
                }
                chips={
                  <>
                    {result.kind === "pack" && result.packLabel ? (
                      <Chip label={result.packLabel} size="small" color="secondary" />
                    ) : null}
                    <Chip
                      label={CATALOG_SOURCE_LABELS[result.source]}
                      size="small"
                      variant="outlined"
                    />
                  </>
                }
                onClick={() => onSelect(result, debounced)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
};

export default CatalogSearch;
