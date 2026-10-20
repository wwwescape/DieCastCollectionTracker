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
import { TOAST_OPTIONS } from "../utils/toastOptions";
import CarForm, { withFormDefaults, type CarFormValues } from "./CarForm";
import CatalogSearch from "./CatalogSearch";
import { useTranslation } from "react-i18next";

type AddMode = "catalog" | "manual";

export interface AddCarLocationState {
  prefill?: Partial<CarFormValues>;
}

const MODE_KEY = "addCar.mode";
const QUERY_KEY = "addCar.catalogQuery";
const SOURCE_KEY = "addCar.catalogSource";

const AddCarPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const createCar = useCreateCar();
  const prefill = (location.state as AddCarLocationState | null)?.prefill;

  // Arriving with a prefill (a version picked on the casting page) stays on the catalog tab
  // and shows the pre-filled form for review in place of the search. Switching tabs drops the
  // prefill, so "Manually" always means a blank form.
  const [mode, setMode] = useState<AddMode>(
    prefill ? "catalog" : readSessionValue<AddMode>(MODE_KEY, "catalog")
  );
  const [showPrefill, setShowPrefill] = useState(Boolean(prefill));

  const handleModeChange = (next: AddMode) => {
    setMode(next);
    setShowPrefill(false);
    writeSessionValue(MODE_KEY, next);
  };

  const backToVersions = () => {
    if (!prefill?.catalogSource || !prefill.catalogTitle) {
      setShowPrefill(false);
      return;
    }
    const params = new URLSearchParams({
      source: prefill.catalogSource,
      title: prefill.catalogTitle,
      q: readSessionValue(QUERY_KEY, ""),
    });
    navigate(`/collection/cars/add/catalog?${params}`);
  };

  const handleSubmit = async (input: CarInput) => {
    try {
      await createCar.mutateAsync(input);
      toast.success(t("cars.added"), TOAST_OPTIONS);
      navigate("/collection/cars");
    } catch (error) {
      console.error("Error adding car:", error);
      toast.error(t("cars.addError"), TOAST_OPTIONS);
    }
  };

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t("cars.addCar")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("cars.addIntro")}
        </Typography>
      </Box>
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
              {t("cars.backToVersions")}
            </Button>
          </Box>
          <CarForm
            initialValues={withFormDefaults(prefill)}
            submitLabel={t("cars.addCar")}
            onSubmit={handleSubmit}
          />
        </>
      ) : mode === "catalog" ? (
        <CatalogSearch
          initialQuery={readSessionValue(QUERY_KEY, "")}
          initialSource={readSessionValue<CatalogSearchSource>(SOURCE_KEY, "all")}
          onQueryChange={(query, source) => {
            writeSessionValue(QUERY_KEY, query);
            writeSessionValue(SOURCE_KEY, source);
          }}
          onSelect={(casting, query) =>
            navigate(
              `/collection/cars/add/catalog?${new URLSearchParams({ source: casting.source, title: casting.title, q: query })}`
            )
          }
        />
      ) : (
        <CarForm submitLabel={t("cars.addCar")} onSubmit={handleSubmit} />
      )}
    </>
  );
};

export default AddCarPage;
