import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useTranslation } from "react-i18next";
import type { CatalogSet, CatalogSourceId } from "../api/catalog";
import type { AddSetLocationState } from "../components/AddSetPage";
import ItemCard from "../components/ItemCard";
import { useCatalogSet, useImportWikiImage } from "../hooks/useCatalog";
import { useCollectionIndex } from "../hooks/useCollectionIndex";
import {
  CATALOG_SOURCE_LABELS,
  castingDisplayName,
  catalogSetToFormValues,
  wikiImageAtWidth,
} from "../utils/catalog";
import { hasCarNamed, holdingForSet } from "../utils/collectionIndex";
import { TOAST_OPTIONS } from "../utils/toastOptions";

const SOURCES: CatalogSourceId[] = ["hotwheels", "matchbox"];

// Step two of "Add Set → From wiki catalog": the set's page, with the cars that came with it.
// "Add this set" copies its photo into uploads/ and opens the Add Set form pre-filled; a set
// already in the collection opens the existing one instead.
const CatalogSetPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const source = SOURCES.find((candidate) => candidate === params.get("source"));
  const title = params.get("title") ?? "";
  const { data: set, isLoading, error } = useCatalogSet(source, title || undefined);
  const collection = useCollectionIndex();
  const importImage = useImportWikiImage();

  const handleAdd = async (picked: CatalogSet) => {
    const prefill = catalogSetToFormValues(picked);
    if (picked.imageUrl) {
      try {
        prefill.photo = await importImage.mutateAsync(picked.imageUrl);
      } catch (importError) {
        console.error("Error importing wiki photo:", importError);
        toast.warn(t("common.wikiPhotoCopyError"), TOAST_OPTIONS);
      }
    }
    const state: AddSetLocationState = { prefill };
    navigate("/collection/sets/add", { state });
  };

  const back = (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/collection/sets/add")}>
        {t("common.backToSearch")}
      </Button>
    </div>
  );

  if (!source || !title) {
    return (
      <Stack spacing={2}>
        {back}
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("sets.catalog.noSet")}</Paper>
      </Stack>
    );
  }
  if (isLoading) {
    return (
      <Stack spacing={2}>
        {back}
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <CircularProgress size={24} aria-label={t("sets.catalog.loading")} />
        </Paper>
      </Stack>
    );
  }
  if (error || !set) {
    const message =
      isAxiosError(error) && error.response?.status === 404
        ? t("sets.catalog.missing")
        : t("sets.catalog.error");
    return (
      <Stack spacing={2}>
        {back}
        <Paper sx={{ p: 3, textAlign: "center" }}>{message}</Paper>
      </Stack>
    );
  }

  const holding = holdingForSet(collection, set.title);
  const details = [
    t(`setTypes.${set.setType}`),
    set.year,
    set.toyNumber ? t("catalog.toyNumber", { value: set.toyNumber }) : null,
    t("common.vehicleCount", { count: set.cars.length }),
  ].filter(Boolean);

  return (
    <Stack spacing={2}>
      {back}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "center" } }}
        >
          {set.imageUrl ? (
            <Box
              component="img"
              src={wikiImageAtWidth(set.imageUrl, 400) ?? undefined}
              alt={set.title}
              referrerPolicy="no-referrer"
              sx={{
                width: { xs: "100%", sm: 200 },
                maxHeight: 200,
                objectFit: "contain",
                borderRadius: 1,
              }}
            />
          ) : null}
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="h5" component="h1">
                {castingDisplayName(set.title)}
              </Typography>
              {holding ? (
                <>
                  <Chip
                    label={t(`status.${holding.status}`)}
                    size="small"
                    color={holding.status === "owned" ? "primary" : "default"}
                  />
                  <Chip label={holding.quantity} size="small" aria-label={t("common.quantity")} />
                </>
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {set.manufacturer} · {details.join(" · ")}
            </Typography>
            <Link
              href={set.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.5 }}
            >
              {t("common.viewOnWiki", { wiki: CATALOG_SOURCE_LABELS[set.source] })}{" "}
              <OpenInNewIcon fontSize="inherit" />
            </Link>
          </Box>
          {holding ? (
            <Button
              variant="outlined"
              onClick={() => navigate(`/collection/sets/${holding.id}/edit`)}
              sx={{ alignSelf: { xs: "stretch", sm: "center" }, flexShrink: 0 }}
            >
              {t("catalog.viewInCollection")}
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={importImage.isPending}
              onClick={() => void handleAdd(set)}
              sx={{ alignSelf: { xs: "stretch", sm: "center" }, flexShrink: 0 }}
            >
              {t("sets.catalog.addThisSet")}
            </Button>
          )}
        </Stack>
      </Paper>

      {set.cars.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
          {t("sets.catalog.noVehicles")}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {set.cars.map((car, index) => (
            <Grid key={index} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <ItemCard
                title={car.name}
                subtitle={car.color}
                imageUrl={wikiImageAtWidth(car.photoUrl, 400) ?? car.thumbnailUrl}
                imageFit="contain"
                relatedHint={hasCarNamed(collection, car.name) ? t("catalog.relatedVehicle") : null}
              />
            </Grid>
          ))}
        </Grid>
      )}
      <Backdrop
        open={importImage.isPending}
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.modal + 1 }}
      >
        <CircularProgress color="inherit" aria-label={t("common.copyingPhoto")} />
      </Backdrop>
    </Stack>
  );
};

export default CatalogSetPage;
