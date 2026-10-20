import { useState } from "react";
import { isAxiosError } from "axios";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
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
import type { CatalogCastingSummary, CatalogSearchSource } from "../api/catalog";
import { MIN_CATALOG_SEARCH_LENGTH, useCatalogSearch } from "../hooks/useCatalog";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { CATALOG_SOURCE_LABELS, castingDisplayName } from "../utils/catalog";

const SOURCE_OPTIONS: { value: CatalogSearchSource; label: string }[] = [
  { value: "all", label: "All" },
  { value: "hotwheels", label: "Hot Wheels" },
  { value: "matchbox", label: "Matchbox" },
];

interface CatalogSearchProps {
  initialQuery?: string;
  initialSource?: CatalogSearchSource;
  onSelect: (casting: CatalogCastingSummary, query: string) => void;
  onQueryChange?: (query: string, source: CatalogSearchSource) => void;
}

// Searches the Hot Wheels and Matchbox wikis by name or by the toy number printed on the
// card (e.g. HYW18). Results are casting pages; picking one moves on to its versions.
const CatalogSearch = ({
  initialQuery = "",
  initialSource = "all",
  onSelect,
  onQueryChange,
}: CatalogSearchProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [source, setSource] = useState<CatalogSearchSource>(initialSource);

  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 600);
  const isActive = debounced.length >= MIN_CATALOG_SEARCH_LENGTH;
  const { data: results, isFetching, error } = useCatalogSearch(isActive ? debounced : "", source);
  const isPendingDebounce = trimmed.length >= MIN_CATALOG_SEARCH_LENGTH && trimmed !== debounced;
  const isSearching = isPendingDebounce || (isActive && isFetching);

  const errorMessage =
    error && isAxiosError(error) && error.response?.status === 502
      ? "The wiki can't be reached right now. Try again in a moment, or add the car manually."
      : error
        ? "Search failed. Please try again."
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
            label="Search by name or toy number"
            placeholder="e.g. Skyline GT-R or HYW18"
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
                    <CircularProgress size={20} aria-label="Searching" />
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
            aria-label="Catalog source"
            sx={{ flexShrink: 0 }}
          >
            {SOURCE_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
          Catalog data comes from the community{" "}
          <Link href="https://hotwheels.fandom.com" target="_blank" rel="noopener noreferrer">
            Hot Wheels Wiki
          </Link>{" "}
          and{" "}
          <Link href="https://matchbox.fandom.com" target="_blank" rel="noopener noreferrer">
            Matchbox Wiki
          </Link>{" "}
          (CC BY-SA).
        </Typography>
      </Paper>

      {errorMessage ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{errorMessage}</Paper>
      ) : !isActive ? (
        <Paper sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
          Type at least {MIN_CATALOG_SEARCH_LENGTH} characters to search.
        </Paper>
      ) : results && results.length === 0 && !isSearching ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          No castings found. Try another name or add the car manually.
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {(results ?? []).map((result) => (
            <Grid key={`${result.source}:${result.title}`} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Card sx={{ height: "100%", borderRadius: 2, border: 1, borderColor: "divider" }}>
                <CardActionArea onClick={() => onSelect(result, debounced)} sx={{ height: "100%" }}>
                  <Box sx={{ position: "relative", aspectRatio: "4 / 3", bgcolor: "action.hover" }}>
                    {result.thumbnailUrl ? (
                      <Box
                        component="img"
                        src={result.thumbnailUrl}
                        alt={result.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        sx={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : null}
                  </Box>
                  <Box sx={{ p: 1.25 }}>
                    <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
                      {castingDisplayName(result.title)}
                    </Typography>
                    <Chip
                      label={CATALOG_SOURCE_LABELS[result.source]}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.75 }}
                    />
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
};

export default CatalogSearch;
