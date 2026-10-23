import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useTranslation } from "react-i18next";
import Page from "../components/Page";
import { openedFrom, useStepBack } from "../utils/navState";
import type { CatalogPack, CatalogSetCar, CatalogSourceId } from "../api/catalog";
import type { CarStatus } from "../api/types";
import type { AddCarLocationState } from "../components/AddCarPage";
import { formValuesToInput, withFormDefaults } from "../components/CarForm";
import ItemCard from "../components/ItemCard";
import { useCarList, useCreateCarsBulk } from "../hooks/useCars";
import { useCatalogPack, useImportWikiImage } from "../hooks/useCatalog";
import { useCollectionIndex } from "../hooks/useCollectionIndex";
import {
  CATALOG_SOURCE_LABELS,
  castingDisplayName,
  packCarToFormValues,
  wikiImageAtWidth,
} from "../utils/catalog";
import { holdingForPackCar } from "../utils/collectionIndex";
import { TOAST_OPTIONS } from "../utils/toastOptions";

const SOURCES: CatalogSourceId[] = ["hotwheels", "matchbox"];
const STATUSES: CarStatus[] = ["owned", "wishlist"];

// Step two of "Add Vehicle → From wiki catalog" for a multi-pack: every car in the pack, all
// ticked except the ones already in the collection. "Add N vehicles" adds the ticked cars in
// one go (the server copies their wiki photos); "Edit before adding" opens the usual
// pre-filled form for a single car instead.
const CatalogPackPageContent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const stepBack = useStepBack();
  const location = useLocation();
  const [params] = useSearchParams();
  const source = SOURCES.find((candidate) => candidate === params.get("source"));
  const title = params.get("title") ?? "";
  const { data: pack, isLoading, error } = useCatalogPack(source, title || undefined);
  const collection = useCollectionIndex();
  const createCars = useCreateCarsBulk();
  const { isSuccess: collectionLoaded } = useCarList();
  const importImage = useImportWikiImage();
  const [status, setStatus] = useState<CarStatus>("owned");
  const [selected, setSelected] = useState<ReadonlySet<number> | null>(null);

  const holdings = useMemo(
    () =>
      (pack?.cars ?? []).map((car) => holdingForPackCar(collection, car.name, pack!.toyNumbers)),
    [pack, collection]
  );

  // Tick everything not already in the collection, once per pack and only after the
  // collection has loaded. Later collection changes (e.g. the cars just added) don't reset
  // what the user ticked.
  useEffect(() => {
    if (pack && collectionLoaded && selected === null) {
      setSelected(new Set(pack.cars.map((_, index) => index).filter((index) => !holdings[index])));
    }
  }, [pack, collectionLoaded, holdings, selected]);

  const back = (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => stepBack("/collection/vehicles/add")}>
        {t("common.backToSearch")}
      </Button>
    </div>
  );

  if (!source || !title) {
    return (
      <Stack spacing={2}>
        {back}
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("catalog.pack.noPack")}</Paper>
      </Stack>
    );
  }
  if (isLoading) {
    return (
      <Stack spacing={2}>
        {back}
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <CircularProgress size={24} aria-label={t("catalog.pack.loading")} />
        </Paper>
      </Stack>
    );
  }
  if (error || !pack) {
    const message =
      isAxiosError(error) && error.response?.status === 404
        ? t("catalog.pack.missing")
        : t("catalog.pack.error");
    return (
      <Stack spacing={2}>
        {back}
        <Paper sx={{ p: 3, textAlign: "center" }}>{message}</Paper>
      </Stack>
    );
  }

  const ticked = selected ?? new Set<number>();
  const allTicked = pack.cars.length > 0 && ticked.size === pack.cars.length;
  const busy = createCars.isPending || importImage.isPending;

  const toggle = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const handleAdd = async (picked: CatalogPack) => {
    const cars = picked.cars.filter((_, index) => ticked.has(index));
    try {
      const result = await createCars.mutateAsync(
        cars.map((car) => ({
          ...formValuesToInput(withFormDefaults({ ...packCarToFormValues(picked, car), status })),
          wikiPhotoUrl: car.photoUrl,
        }))
      );
      toast.success(
        t("catalog.pack.added", {
          count: result.cars.length,
          pack: castingDisplayName(picked.title),
        }),
        TOAST_OPTIONS
      );
      if (result.photosFailed > 0) {
        toast.warn(t("catalog.pack.photosFailed", { count: result.photosFailed }), TOAST_OPTIONS);
      }
      // Replace the pack page, so Back can't offer to add the same cars again.
      navigate("/collection/vehicles", { replace: true });
    } catch (addError) {
      console.error("Error adding pack vehicles:", addError);
      toast.error(t("catalog.pack.addError"), TOAST_OPTIONS);
    }
  };

  const handleEditBeforeAdding = async (picked: CatalogPack, car: CatalogSetCar) => {
    const prefill = { ...packCarToFormValues(picked, car), status };
    if (car.photoUrl) {
      try {
        prefill.photo = await importImage.mutateAsync(car.photoUrl);
      } catch (importError) {
        console.error("Error importing wiki photo:", importError);
        toast.warn(t("common.wikiPhotoCopyError"), TOAST_OPTIONS);
      }
    }
    const state: AddCarLocationState = {
      prefill,
      backTo: `${location.pathname}${location.search}`,
    };
    navigate("/collection/vehicles/add", { state });
  };

  const details = [
    pack.year,
    pack.toyNumbers.length ? t("catalog.toyNumber", { value: pack.toyNumbers.join(", ") }) : null,
    t("common.vehicleCount", { count: pack.cars.length }),
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
          {pack.imageUrl ? (
            <Box
              component="img"
              src={wikiImageAtWidth(pack.imageUrl, 400) ?? undefined}
              alt={pack.title}
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
                {castingDisplayName(pack.title)}
              </Typography>
              <Chip label={pack.packLabel} size="small" color="secondary" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {pack.manufacturer} · {details.join(" · ")}
            </Typography>
            <Link
              href={pack.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.5 }}
            >
              {t("common.viewOnWiki", { wiki: CATALOG_SOURCE_LABELS[pack.source] })}{" "}
              <OpenInNewIcon fontSize="inherit" />
            </Link>
          </Box>
        </Stack>
      </Paper>

      {pack.cars.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
          {t("catalog.pack.noVehicles")}
        </Paper>
      ) : (
        <>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allTicked}
                    indeterminate={ticked.size > 0 && !allTicked}
                    onChange={() =>
                      setSelected(
                        allTicked ? new Set() : new Set(pack.cars.map((_, index) => index))
                      )
                    }
                  />
                }
                label={t("catalog.pack.selectedCount", {
                  count: ticked.size,
                  total: pack.cars.length,
                })}
              />
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ alignItems: { sm: "center" } }}
              >
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={status}
                  onChange={(_event, value: CarStatus | null) => value && setStatus(value)}
                  aria-label={t("catalog.pack.addAs")}
                >
                  {STATUSES.map((option) => (
                    <ToggleButton key={option} value={option}>
                      {t(`status.${option}`)}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <Button
                  variant="contained"
                  disabled={ticked.size === 0 || busy}
                  onClick={() => void handleAdd(pack)}
                >
                  {t("catalog.pack.addSelected", { count: ticked.size })}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            {pack.cars.map((car, index) => {
              const holding = holdings[index];
              return (
                <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <ItemCard
                    title={car.name}
                    subtitle={car.color}
                    detail={car.castingTitle ? castingDisplayName(car.castingTitle) : null}
                    imageUrl={wikiImageAtWidth(car.photoUrl, 400) ?? car.thumbnailUrl}
                    imageFit="contain"
                    holding={holding}
                    highlighted={ticked.has(index)}
                    action={
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", justifyContent: "space-between" }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox checked={ticked.has(index)} onChange={() => toggle(index)} />
                          }
                          label={t("catalog.pack.include")}
                        />
                        {holding ? (
                          <Button
                            size="small"
                            onClick={() =>
                              navigate(`/collection/vehicles/${holding.id}`, {
                                state: openedFrom(location),
                              })
                            }
                          >
                            {t("catalog.viewInCollection")}
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            disabled={busy}
                            onClick={() => void handleEditBeforeAdding(pack, car)}
                          >
                            {t("catalog.pack.editBeforeAdding")}
                          </Button>
                        )}
                      </Stack>
                    }
                  />
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
      <Backdrop open={busy} sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.modal + 1 }}>
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress color="inherit" aria-label={t("catalog.pack.adding")} />
          {createCars.isPending ? (
            <Typography>{t("catalog.pack.addingCount", { count: ticked.size })}</Typography>
          ) : null}
        </Stack>
      </Backdrop>
    </Stack>
  );
};

// The wiki result in the page frame: breadcrumbs back to the list and the search.
const CatalogPackPage = () => {
  const { t } = useTranslation();
  return (
    <Page
      crumbs={[
        { label: t("nav.collection") },
        { label: t("vehicles.title"), to: "/collection/vehicles" },
        { label: t("vehicles.addVehicle"), to: "/collection/vehicles/add" },
        { label: t("catalog.wikiResult") },
      ]}
    >
      <CatalogPackPageContent />
    </Page>
  );
};

export default CatalogPackPage;
