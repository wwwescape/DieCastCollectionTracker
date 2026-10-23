import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import type { CatalogSearchSource } from "../api/catalog";
import type { CarInput } from "../api/types";
import { useCreateCar } from "../hooks/useCars";
import { readSessionValue, writeSessionValue } from "../utils/sessionValue";
import { useStepBack } from "../utils/navState";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import CarForm, { withFormDefaults, type CarFormValues } from "./CarForm";
import CatalogSearch from "./CatalogSearch";
import { useTranslation } from "react-i18next";
import Page from "./Page";

type AddMode = "catalog" | "manual";

export interface AddCarLocationState {
  prefill?: Partial<CarFormValues>;
  // Where "Back" returns to, when not the prefill's casting page (e.g. the multi-pack page a
  // car was picked from).
  backTo?: string;
  // Text from the header's "Search the wiki" option.
  catalogQuery?: string;
}

const MODE_KEY = "addCar.mode";
const QUERY_KEY = "addCar.catalogQuery";
const SOURCE_KEY = "addCar.catalogSource";

const AddCarPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const stepBack = useStepBack();
  const createCar = useCreateCar();
  const locationState = location.state as AddCarLocationState | null;
  const prefill = locationState?.prefill;

  // Arriving with a prefill (a version picked on the casting page) stays on the catalog tab
  // and shows the pre-filled form for review in place of the search. Switching tabs drops the
  // prefill, so "Manually" always means a blank form.
  const [mode, setMode] = useState<AddMode>(
    prefill || locationState?.catalogQuery
      ? "catalog"
      : readSessionValue<AddMode>(MODE_KEY, "catalog")
  );
  const [showPrefill, setShowPrefill] = useState(Boolean(prefill));

  const handleModeChange = (next: AddMode) => {
    setMode(next);
    setShowPrefill(false);
    writeSessionValue(MODE_KEY, next);
  };

  const backToVersions = () => {
    if (locationState?.backTo) {
      stepBack(locationState.backTo);
      return;
    }
    if (!prefill?.catalogSource || !prefill.catalogTitle) {
      setShowPrefill(false);
      return;
    }
    const params = new URLSearchParams({
      source: prefill.catalogSource,
      title: prefill.catalogTitle,
      q: readSessionValue(QUERY_KEY, ""),
    });
    stepBack(`/collection/vehicles/add/catalog?${params}`);
  };

  const handleSubmit = async (input: CarInput) => {
    try {
      await createCar.mutateAsync(input);
      toast.success(t("vehicles.added"), TOAST_OPTIONS);
      // Replace the filled-in form, so Back can't reopen it and add the same thing twice.
      navigate("/collection/vehicles", { replace: true });
    } catch (error) {
      console.error("Error adding car:", error);
      toast.error(t("vehicles.addError"), TOAST_OPTIONS);
    }
  };

  return (
    <Page
      crumbs={[
        { label: t("nav.collection") },
        { label: t("vehicles.title"), to: "/collection/vehicles" },
        { label: t("vehicles.addVehicle") },
      ]}
    >
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
        {t("vehicles.addIntro")}
      </Typography>
      <RadioGroup
        row
        value={mode}
        onChange={(event) => handleModeChange(event.target.value as AddMode)}
        sx={{ mb: 2 }}
      >
        <FormControlLabel value="catalog" control={<Radio />} label={t("common.fromWikiCatalog")} />
        <FormControlLabel value="manual" control={<Radio />} label={t("common.manually")} />
      </RadioGroup>
      {mode === "catalog" && prefill && showPrefill ? (
        <>
          <Box sx={{ mb: 1 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={backToVersions}>
              {locationState?.backTo ? t("catalog.pack.backToPack") : t("vehicles.backToVersions")}
            </Button>
          </Box>
          <CarForm
            initialValues={withFormDefaults(prefill)}
            submitLabel={t("vehicles.addVehicle")}
            onSubmit={handleSubmit}
          />
        </>
      ) : mode === "catalog" ? (
        <CatalogSearch
          // The header's "Search the wiki" sends fresh text; remount so it runs even here.
          key={locationState?.catalogQuery ? location.key : undefined}
          initialQuery={readSessionValue(QUERY_KEY, "")}
          initialSource={readSessionValue<CatalogSearchSource>(SOURCE_KEY, "all")}
          onQueryChange={(query, source) => {
            writeSessionValue(QUERY_KEY, query);
            writeSessionValue(SOURCE_KEY, source);
          }}
          onSelect={(result, query) => {
            const params = new URLSearchParams({
              source: result.source,
              title: result.title,
              q: query,
            });
            navigate(
              result.kind === "pack"
                ? `/collection/vehicles/add/pack?${params}`
                : `/collection/vehicles/add/catalog?${params}`
            );
          }}
        />
      ) : (
        <CarForm submitLabel={t("vehicles.addVehicle")} onSubmit={handleSubmit} />
      )}
    </Page>
  );
};

export default AddCarPage;
