import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Typography from "@mui/material/Typography";
import type { CatalogSearchSource } from "../api/catalog";
import type { CarInput } from "../api/types";
import { useCreateCar } from "../hooks/useCars";
import { readSessionValue, writeSessionValue } from "../utils/sessionValue";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import CarForm, { withFormDefaults, type CarFormValues } from "./CarForm";
import CatalogSearch from "./CatalogSearch";

type AddMode = "catalog" | "manual";

export interface AddCarLocationState {
  prefill?: Partial<CarFormValues>;
}

const MODE_KEY = "addCar.mode";
const QUERY_KEY = "addCar.catalogQuery";
const SOURCE_KEY = "addCar.catalogSource";

const AddCarPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createCar = useCreateCar();
  const prefill = (location.state as AddCarLocationState | null)?.prefill;

  // Arriving with a prefill (a version picked from the catalog) always shows the form,
  // whatever tab was remembered, until the user switches tabs themselves.
  const [mode, setMode] = useState<AddMode>(
    prefill ? "manual" : readSessionValue<AddMode>(MODE_KEY, "catalog")
  );

  const handleModeChange = (next: AddMode) => {
    setMode(next);
    writeSessionValue(MODE_KEY, next);
  };

  const handleSubmit = async (input: CarInput) => {
    try {
      await createCar.mutateAsync(input);
      toast.success("Car added!", TOAST_OPTIONS);
      navigate("/");
    } catch (error) {
      console.error("Error adding car:", error);
      toast.error("Error adding car. Please try again.", TOAST_OPTIONS);
    }
  };

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Add Car
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Find the casting on the Hot Wheels or Matchbox wiki to fill in the details, or enter them
          yourself.
        </Typography>
      </Box>
      <RadioGroup
        row
        value={mode}
        onChange={(event) => handleModeChange(event.target.value as AddMode)}
        sx={{ mb: 2 }}
      >
        <FormControlLabel value="catalog" control={<Radio />} label="From wiki catalog" />
        <FormControlLabel value="manual" control={<Radio />} label="Manually" />
      </RadioGroup>
      {mode === "catalog" ? (
        <CatalogSearch
          initialQuery={readSessionValue(QUERY_KEY, "")}
          initialSource={readSessionValue<CatalogSearchSource>(SOURCE_KEY, "all")}
          onQueryChange={(query, source) => {
            writeSessionValue(QUERY_KEY, query);
            writeSessionValue(SOURCE_KEY, source);
          }}
          onSelect={(casting, query) =>
            navigate(
              `/cars/add/catalog?${new URLSearchParams({ source: casting.source, title: casting.title, q: query })}`
            )
          }
        />
      ) : (
        <CarForm
          key={prefill ? "prefilled" : "blank"}
          initialValues={prefill ? withFormDefaults(prefill) : undefined}
          submitLabel="Add Car"
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
};

export default AddCarPage;
