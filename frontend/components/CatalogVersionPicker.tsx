import { useMemo } from "react";
import { isAxiosError } from "axios";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { CatalogCasting, CatalogSourceId, CatalogVersion } from "../api/catalog";
import { useCarList } from "../hooks/useCars";
import { useCatalogCasting } from "../hooks/useCatalog";
import {
  CATALOG_SOURCE_LABELS,
  castingDisplayName,
  normalizeToyNumber,
  versionMatchesQuery,
  wikiImageAtWidth,
} from "../utils/catalog";

interface CatalogVersionPickerProps {
  source: CatalogSourceId;
  title: string;
  // The search that led here — when it's a toy number, that release is flagged and listed first.
  query?: string;
  pickLabel: string;
  onPick: (casting: CatalogCasting, version: CatalogVersion) => void;
  busy?: boolean;
}

const CatalogVersionPicker = ({
  source,
  title,
  query,
  pickLabel,
  onPick,
  busy = false,
}: CatalogVersionPickerProps) => {
  const { data: casting, isLoading, error } = useCatalogCasting(source, title);
  const { data: cars } = useCarList();

  // Toy numbers already in the collection, so the picker can say "In collection" the way
  // VideoGameTrackarr's search results flag games already in the library.
  const ownedToyNumbers = useMemo(
    () =>
      new Set((cars ?? []).map((car) => normalizeToyNumber(car.castNumber ?? "")).filter(Boolean)),
    [cars]
  );

  // Wiki tables run oldest-first; newest-first suits the car in hand, with a toy-number
  // match pinned to the top.
  const versions = useMemo(() => {
    const newestFirst = [...(casting?.versions ?? [])].reverse();
    const matched = newestFirst.filter((version) => versionMatchesQuery(version, query));
    return [...matched, ...newestFirst.filter((version) => !matched.includes(version))];
  }, [casting, query]);

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress size={24} aria-label="Loading casting" />
      </Paper>
    );
  }
  if (error || !casting) {
    const message =
      isAxiosError(error) && error.response?.status === 404
        ? "That casting page no longer exists on the wiki."
        : "Couldn't load this casting from the wiki. Please try again.";
    return <Paper sx={{ p: 3, textAlign: "center" }}>{message}</Paper>;
  }

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "center" } }}
        >
          {casting.imageUrl ? (
            <Box
              component="img"
              src={wikiImageAtWidth(casting.imageUrl, 400) ?? undefined}
              alt={casting.title}
              referrerPolicy="no-referrer"
              sx={{
                width: { xs: "100%", sm: 200 },
                maxHeight: 160,
                objectFit: "contain",
                borderRadius: 1,
              }}
            />
          ) : null}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h2">
              {castingDisplayName(casting.title)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {casting.manufacturer} · {casting.versions.length} version
              {casting.versions.length === 1 ? "" : "s"}
            </Typography>
            <Link
              href={casting.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.5 }}
            >
              View on {CATALOG_SOURCE_LABELS[casting.source]} <OpenInNewIcon fontSize="inherit" />
            </Link>
          </Box>
        </Stack>
      </Paper>

      {versions.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          {"The wiki doesn't list any versions for this casting yet."}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              disabled={busy}
              onClick={() =>
                onPick(casting, {
                  collectorNumber: null,
                  year: null,
                  series: null,
                  seriesNumber: null,
                  color: null,
                  tampo: null,
                  toyNumbers: [],
                  notes: null,
                  photoUrl: casting.imageUrl,
                  thumbnailUrl: null,
                })
              }
            >
              {pickLabel}
            </Button>
          </Box>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {versions.map((version, index) => {
            const matched = versionMatchesQuery(version, query);
            const owned = version.toyNumbers.some((toyNumber) => ownedToyNumbers.has(toyNumber));
            const series = [version.series, version.seriesNumber].filter(Boolean).join(" · ");
            return (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 2,
                    border: matched ? 2 : 1,
                    borderColor: matched ? "primary.main" : "divider",
                  }}
                >
                  <Box sx={{ position: "relative", aspectRatio: "4 / 3", bgcolor: "action.hover" }}>
                    {version.thumbnailUrl || version.photoUrl ? (
                      <Box
                        component="img"
                        src={
                          wikiImageAtWidth(version.photoUrl, 400) ??
                          version.thumbnailUrl ??
                          undefined
                        }
                        alt={[version.color, version.year].filter(Boolean).join(" ")}
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
                    ) : (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          position: "absolute",
                          inset: 0,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        No photo on the wiki
                      </Typography>
                    )}
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ position: "absolute", top: 8, left: 8 }}
                    >
                      {matched ? (
                        <Chip label="Matches your search" size="small" color="primary" />
                      ) : null}
                      {owned ? <Chip label="In collection" size="small" color="success" /> : null}
                    </Stack>
                  </Box>
                  <Stack spacing={0.5} sx={{ p: 1.5, flexGrow: 1 }}>
                    <Typography variant="subtitle2">
                      {[version.year, version.color].filter(Boolean).join(" · ") ||
                        "Unknown release"}
                    </Typography>
                    {series ? (
                      <Typography variant="body2" color="text.secondary">
                        {series}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" color="text.secondary">
                      {[
                        version.collectorNumber ? `Col # ${version.collectorNumber}` : null,
                        version.toyNumbers.length ? `Toy # ${version.toyNumbers.join(", ")}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Typography>
                    {version.tampo ? (
                      <Typography variant="caption" color="text.secondary">
                        {version.tampo}
                      </Typography>
                    ) : null}
                  </Stack>
                  <Box sx={{ p: 1.5, pt: 0 }}>
                    <Button
                      fullWidth
                      variant={matched ? "contained" : "outlined"}
                      disabled={busy}
                      onClick={() => onPick(casting, version)}
                    >
                      {pickLabel}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Stack>
  );
};

export default CatalogVersionPicker;
