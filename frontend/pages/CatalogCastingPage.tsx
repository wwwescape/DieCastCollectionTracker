import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Backdrop from "@mui/material/Backdrop";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import type { CatalogCasting, CatalogSourceId, CatalogVersion } from "../api/catalog";
import type { AddCarLocationState } from "../components/AddCarPage";
import CatalogVersionPicker from "../components/CatalogVersionPicker";
import { useImportWikiImage } from "../hooks/useCatalog";
import { versionToFormValues } from "../utils/catalog";
import { TOAST_OPTIONS } from "../utils/toastOptions";

const SOURCES: CatalogSourceId[] = ["hotwheels", "matchbox"];

// Step two of "Add Car → From wiki catalog": every release of one casting, newest first.
// Picking one copies its photo into uploads/ and opens the Add Car form pre-filled.
const CatalogCastingPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sourceParam = params.get("source");
  const source = SOURCES.find((candidate) => candidate === sourceParam);
  const title = params.get("title") ?? "";
  const query = params.get("q") ?? undefined;
  const importImage = useImportWikiImage();

  const handlePick = async (casting: CatalogCasting, version: CatalogVersion) => {
    const prefill = versionToFormValues(casting, version, query);
    const photoSource = version.photoUrl ?? casting.imageUrl;
    if (photoSource) {
      try {
        prefill.photo = await importImage.mutateAsync(photoSource);
      } catch (error) {
        console.error("Error importing wiki photo:", error);
        toast.warn("Couldn't copy the wiki photo. You can upload one yourself.", TOAST_OPTIONS);
      }
    }
    const state: AddCarLocationState = { prefill };
    navigate("/cars/add", { state });
  };

  return (
    <Stack spacing={2}>
      <div>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/cars/add")}>
          Back to search
        </Button>
      </div>
      {source && title ? (
        <CatalogVersionPicker
          source={source}
          title={title}
          query={query}
          pickLabel="Add this version"
          busy={importImage.isPending}
          onPick={(casting, version) => void handlePick(casting, version)}
        />
      ) : (
        <Paper sx={{ p: 3, textAlign: "center" }}>No casting selected.</Paper>
      )}
      <Backdrop
        open={importImage.isPending}
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.modal + 1 }}
      >
        <CircularProgress color="inherit" aria-label="Copying photo" />
      </Backdrop>
    </Stack>
  );
};

export default CatalogCastingPage;
