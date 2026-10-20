import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useTranslation } from "react-i18next";
import type { CarInput } from "../api/types";
import { useCar, useDeleteCar, useImportCarPhotoFromWiki, useUpdateCar } from "../hooks/useCars";
import { versionToFormValues } from "../utils/catalog";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import CarForm, { carToFormValues, type CarFormValues } from "./CarForm";
import CarPhotoGallery from "./CarPhotoGallery";
import CatalogMatchDialog from "./CatalogMatchDialog";
import ConfirmDialog from "./ConfirmDialog";

const EditCarPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const carId = Number(id);
  const { data: car, isLoading } = useCar(Number.isFinite(carId) ? carId : undefined);
  const updateCar = useUpdateCar(carId);
  const deleteCar = useDeleteCar();
  const importPhoto = useImportCarPhotoFromWiki(carId);
  const [matchOpen, setMatchOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // A catalog match is applied to the form, not saved — the user reviews it and saves as
  // usual. Bumping the key remounts CarForm so it picks up the merged values.
  const [matchedValues, setMatchedValues] = useState<CarFormValues | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (input: CarInput) => {
    try {
      await updateCar.mutateAsync(input);
      toast.success(t("vehicles.updated"), TOAST_OPTIONS);
      navigate("/collection/vehicles");
    } catch (error) {
      console.error("Error updating car:", error);
      toast.error(t("vehicles.updateError"), TOAST_OPTIONS);
    }
  };

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await deleteCar.mutateAsync(carId);
      toast.success(t("vehicles.deleted", { name: car?.name }), TOAST_OPTIONS);
      navigate("/collection/vehicles");
    } catch (error) {
      console.error("Error deleting car:", error);
      toast.error(t("vehicles.deleteError"), TOAST_OPTIONS);
    }
  };

  if (isLoading) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>;
  }
  if (!car) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>{t("vehicles.notFound")}</Paper>;
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
          {t("vehicles.editVehicle")}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<MenuBookIcon />}
            onClick={() => setMatchOpen(true)}
          >
            {car.catalogTitle ? t("vehicles.rematchToCatalog") : t("vehicles.matchToCatalog")}
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={deleteCar.isPending}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            {t("common.delete")}
          </Button>
        </Stack>
      </Stack>
      <Stack spacing={2}>
        <CarForm
          key={formKey}
          initialValues={formValues}
          submitLabel={t("common.saveChanges")}
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
          toast.info(t("vehicles.matchFilled"), TOAST_OPTIONS);
          const photoSource = version.photoUrl ?? casting.imageUrl;
          if (addPhoto && photoSource) {
            try {
              await importPhoto.mutateAsync(photoSource);
            } catch (error) {
              console.error("Error importing wiki photo:", error);
              toast.warn(t("vehicles.matchPhotoError"), TOAST_OPTIONS);
            }
          }
        }}
      />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t("vehicles.deleteConfirmTitle")}
        description={t("vehicles.deleteConfirmDescription", { name: car.name })}
        confirmLabel={t("common.delete")}
        confirmColor="error"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};

export default EditCarPage;
