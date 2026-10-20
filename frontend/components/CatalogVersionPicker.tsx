import { useMemo } from "react";
import { isAxiosError } from "axios";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useTranslation } from "react-i18next";
import type { CatalogCasting, CatalogSourceId, CatalogVersion } from "../api/catalog";
import { useCatalogCasting } from "../hooks/useCatalog";
import { useCollectionIndex } from "../hooks/useCollectionIndex";
import {
  CATALOG_SOURCE_LABELS,
  castingDisplayName,
  versionMatchesQuery,
  wikiImageAtWidth,
} from "../utils/catalog";
import { hasSeries, holdingForToyNumbers, type Holding } from "../utils/collectionIndex";
import ItemCard from "./ItemCard";

interface CatalogVersionPickerProps {
  source: CatalogSourceId;
  title: string;
  // The search that led here — when it's a toy number, that release is flagged and listed first.
  query?: string;
  pickLabel: string;
  onPick: (casting: CatalogCasting, version: CatalogVersion) => void;
  // When given, a version already in the collection offers "View in collection" (opening the
  // existing car, where its quantity can go up) instead of adding a duplicate entry.
  onOpenExisting?: (holding: Holding) => void;
  busy?: boolean;
}

const EMPTY_VERSION: Omit<CatalogVersion, "photoUrl"> = {
  collectorNumber: null,
  year: null,
  series: null,
  seriesNumber: null,
  color: null,
  tampo: null,
  toyNumbers: [],
  notes: null,
  thumbnailUrl: null,
};

const CatalogVersionPicker = ({
  source,
  title,
  query,
  pickLabel,
  onPick,
  onOpenExisting,
  busy = false,
}: CatalogVersionPickerProps) => {
  const { t } = useTranslation();
  const { data: casting, isLoading, error } = useCatalogCasting(source, title);
  const collection = useCollectionIndex();

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
        <CircularProgress size={24} aria-label={t("catalog.loadingCasting")} />
      </Paper>
    );
  }
  if (error || !casting) {
    const message =
      isAxiosError(error) && error.response?.status === 404
        ? t("catalog.castingMissing")
        : t("catalog.castingError");
    return <Paper sx={{ p: 3, textAlign: "center" }}>{message}</Paper>;
  }

  const actionFor = (version: CatalogVersion, holding: Holding | undefined, matched: boolean) =>
    holding && onOpenExisting ? (
      <Button fullWidth variant="outlined" onClick={() => onOpenExisting(holding)}>
        {t("catalog.viewInCollection")}
      </Button>
    ) : (
      <Button
        fullWidth
        variant={matched ? "contained" : "outlined"}
        disabled={busy}
        onClick={() => onPick(casting, version)}
      >
        {pickLabel}
      </Button>
    );

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
              {casting.manufacturer} ·{" "}
              {t("catalog.versionCount", { count: casting.versions.length })}
            </Typography>
            <Link
              href={casting.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.5 }}
            >
              {t("common.viewOnWiki", { wiki: CATALOG_SOURCE_LABELS[casting.source] })}{" "}
              <OpenInNewIcon fontSize="inherit" />
            </Link>
          </Box>
        </Stack>
      </Paper>

      {versions.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          {t("catalog.noVersions")}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              disabled={busy}
              onClick={() => onPick(casting, { ...EMPTY_VERSION, photoUrl: casting.imageUrl })}
            >
              {pickLabel}
            </Button>
          </Box>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {versions.map((version, index) => {
            const matched = versionMatchesQuery(version, query);
            const holding = holdingForToyNumbers(collection, version.toyNumbers);
            const series = [version.series, version.seriesNumber].filter(Boolean).join(" · ");
            return (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <ItemCard
                  title={
                    [version.year, version.color].filter(Boolean).join(" · ") ||
                    t("catalog.unknownRelease")
                  }
                  subtitle={series}
                  detail={[
                    version.collectorNumber
                      ? t("catalog.collectorNumber", { value: version.collectorNumber })
                      : null,
                    version.toyNumbers.length
                      ? t("catalog.toyNumber", { value: version.toyNumbers.join(", ") })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  imageUrl={wikiImageAtWidth(version.photoUrl, 400) ?? version.thumbnailUrl}
                  imageFit="contain"
                  holding={holding}
                  relatedHint={
                    hasSeries(collection, version.series) ? t("catalog.relatedSeries") : null
                  }
                  chips={
                    matched ? (
                      <Chip label={t("catalog.matchesSearch")} size="small" color="primary" />
                    ) : null
                  }
                  highlighted={matched}
                  action={actionFor(version, holding, matched)}
                />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Stack>
  );
};

export default CatalogVersionPicker;
