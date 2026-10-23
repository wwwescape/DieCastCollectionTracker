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
import type { SetInput } from "../api/types";
import { useCreateSet } from "../hooks/useSets";
import { readSessionValue, writeSessionValue } from "../utils/sessionValue";
import { useStepBack } from "../utils/navState";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import SetCatalogSearch from "./SetCatalogSearch";
import SetForm, { withSetFormDefaults, type SetFormValues } from "./SetForm";
import { useTranslation } from "react-i18next";
import Page from "./Page";

type AddMode = "catalog" | "manual";

export interface AddSetLocationState {
  prefill?: Partial<SetFormValues>;
}

const MODE_KEY = "addSet.mode";
const QUERY_KEY = "addSet.catalogQuery";

// Same flow as AddCarPage: a set picked on the wiki comes back here pre-filled for review, on
// the catalog tab, and "Manually" always means a blank form.
const AddSetPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const stepBack = useStepBack();
  const location = useLocation();
  const createSet = useCreateSet();
  const prefill = (location.state as AddSetLocationState | null)?.prefill;

  const [mode, setMode] = useState<AddMode>(
    prefill ? "catalog" : readSessionValue<AddMode>(MODE_KEY, "catalog")
  );
  const [showPrefill, setShowPrefill] = useState(Boolean(prefill));

  const handleModeChange = (next: AddMode) => {
    setMode(next);
    setShowPrefill(false);
    writeSessionValue(MODE_KEY, next);
  };

  const backToSet = () => {
    if (!prefill?.catalogSource || !prefill.catalogTitle) {
      setShowPrefill(false);
      return;
    }
    const params = new URLSearchParams({
      source: prefill.catalogSource,
      title: prefill.catalogTitle,
    });
    stepBack(`/collection/sets/add/catalog?${params}`);
  };

  const handleSubmit = async (input: SetInput) => {
    try {
      await createSet.mutateAsync(input);
      toast.success(t("sets.added"), TOAST_OPTIONS);
      // Replace the filled-in form, so Back can't reopen it and add the same thing twice.
      navigate("/collection/sets", { replace: true });
    } catch (error) {
      console.error("Error adding set:", error);
      toast.error(t("sets.addError"), TOAST_OPTIONS);
    }
  };

  return (
    <Page
      crumbs={[
        { label: t("nav.collection") },
        { label: t("sets.title"), to: "/collection/sets" },
        { label: t("sets.addSet") },
      ]}
    >
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
        {t("sets.addIntro")}
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
            <Button startIcon={<ArrowBackIcon />} onClick={backToSet}>
              {t("sets.backToSet")}
            </Button>
          </Box>
          <SetForm
            initialValues={withSetFormDefaults(prefill)}
            submitLabel={t("sets.addSet")}
            onSubmit={handleSubmit}
          />
        </>
      ) : mode === "catalog" ? (
        <SetCatalogSearch
          initialQuery={readSessionValue(QUERY_KEY, "")}
          onQueryChange={(query) => writeSessionValue(QUERY_KEY, query)}
          onSelect={(set) =>
            navigate(
              `/collection/sets/add/catalog?${new URLSearchParams({ source: set.source, title: set.title })}`
            )
          }
        />
      ) : (
        <SetForm submitLabel={t("sets.addSet")} onSubmit={handleSubmit} />
      )}
    </Page>
  );
};

export default AddSetPage;
