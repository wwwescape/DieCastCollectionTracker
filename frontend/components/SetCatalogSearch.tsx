import { useState } from "react";
import { isAxiosError } from "axios";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import SearchIcon from "@mui/icons-material/Search";
import { Trans, useTranslation } from "react-i18next";
import type { CatalogSetSummary } from "../api/catalog";
import { MIN_CATALOG_SEARCH_LENGTH, useCatalogSetSearch } from "../hooks/useCatalog";
import { useCollectionIndex } from "../hooks/useCollectionIndex";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { castingDisplayName } from "../utils/catalog";
import { holdingForSet } from "../utils/collectionIndex";
import ItemCard from "./ItemCard";

interface SetCatalogSearchProps {
  initialQuery?: string;
  onSelect: (set: CatalogSetSummary, query: string) => void;
  onQueryChange?: (query: string) => void;
}

// The sets counterpart of CatalogSearch. Only the Hot Wheels Wiki gives sets their own pages,
// so there's no source toggle; a toy number (e.g. FMY96) finds a set directly. A set already
// in the collection shows its Owned/Wishlisted and quantity chips.
const SetCatalogSearch = ({
  initialQuery = "",
  onSelect,
  onQueryChange,
}: SetCatalogSearchProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const collection = useCollectionIndex();

  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 600);
  const isActive = debounced.length >= MIN_CATALOG_SEARCH_LENGTH;
  const { data: results, isFetching, error } = useCatalogSetSearch(isActive ? debounced : "");
  const isPendingDebounce = trimmed.length >= MIN_CATALOG_SEARCH_LENGTH && trimmed !== debounced;
  const isSearching = isPendingDebounce || (isActive && isFetching);

  const errorMessage =
    error && isAxiosError(error) && error.response?.status === 502
      ? t("sets.catalog.unreachable")
      : error
        ? t("common.searchFailed")
        : null;

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
        <TextField
          label={t("sets.catalog.searchLabel")}
          placeholder={t("sets.catalog.searchPlaceholder")}
          fullWidth
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onQueryChange?.(event.target.value);
          }}
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
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
          <Trans
            i18nKey="sets.catalog.attribution"
            components={{
              hw: (
                <Link
                  href="https://hotwheels.fandom.com"
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
      ) : results && results.length === 0 && !isSearching ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("sets.catalog.noResults")}</Paper>
      ) : (
        <Grid container spacing={2}>
          {(results ?? []).map((result) => (
            <Grid key={result.title} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <ItemCard
                title={castingDisplayName(result.title)}
                imageUrl={result.thumbnailUrl}
                imageFit="contain"
                holding={holdingForSet(collection, result.title)}
                chips={
                  <Chip label={t(`setTypes.${result.setType}`)} size="small" variant="outlined" />
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

export default SetCatalogSearch;
