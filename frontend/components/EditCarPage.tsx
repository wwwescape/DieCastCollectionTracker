import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import type { CarInput } from "../api/types";
import { useCar, useImportCarPhotoFromWiki, useUpdateCar } from "../hooks/useCars";
import { versionToFormValues } from "../utils/catalog";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import CarForm, { carToFormValues, type CarFormValues } from "./CarForm";
import CarPhotoGallery from "./CarPhotoGallery";
import CatalogMatchDialog from "./CatalogMatchDialog";

const EditCarPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const carId = Number(id);
  const { data: car, isLoading } = useCar(Number.isFinite(carId) ? carId : undefined);
  const updateCar = useUpdateCar(carId);
  const importPhoto = useImportCarPhotoFromWiki(carId);
  const [matchOpen, setMatchOpen] = useState(false);
  // A catalog match is applied to the form, not saved — the user reviews it and saves as
  // usual. Bumping the key remounts CarForm so it picks up the merged values.
  const [matchedValues, setMatchedValues] = useState<CarFormValues | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (input: CarInput) => {
    try {
      await updateCar.mutateAsync(input);
      toast.success("Car updated!", TOAST_OPTIONS);
      navigate("/");
    } catch (error) {
      console.error("Error updating car:", error);
      toast.error("Error updating car. Please try again.", TOAST_OPTIONS);
    }
  };

  if (isLoading) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>Loading...</Paper>;
  }
  if (!car) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>Car not found.</Paper>;
  }

  const formValues = matchedValues ?? carToFormValues(car);

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          mb: 2,
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          rowGap: 1,
        }}
      >
        <Typography variant="h4" component="h1">
          Edit Car
        </Typography>
        <Button variant="outlined" startIcon={<MenuBookIcon />} onClick={() => setMatchOpen(true)}>
          {car.catalogTitle ? "Re-match to catalog" : "Match to catalog"}
        </Button>
      </Stack>
      <Stack spacing={2}>
        <CarForm
          key={formKey}
          initialValues={formValues}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          showPhotoUpload={false}
        />
        <CarPhotoGallery carId={car.id} photos={car.photos} />
      </Stack>
      <CatalogMatchDialog
        open={matchOpen}
        initialQuery={car.castNumber || car.name}
        busy={importPhoto.isPending}
        onClose={() => setMatchOpen(false)}
        onMatch={async ({ casting, version, query, addPhoto }) => {
          setMatchedValues({ ...formValues, ...versionToFormValues(casting, version, query) });
          setFormKey((key) => key + 1);
          setMatchOpen(false);
          toast.info("Details filled in from the wiki. Review them and save.", TOAST_OPTIONS);
          const photoSource = version.photoUrl ?? casting.imageUrl;
          if (addPhoto && photoSource) {
            try {
              await importPhoto.mutateAsync(photoSource);
            } catch (error) {
              console.error("Error importing wiki photo:", error);
              toast.warn("Couldn't copy the wiki photo into the gallery.", TOAST_OPTIONS);
            }
          }
        }}
      />
    </>
  );
};

export default EditCarPage;
