import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import { useTranslation } from "react-i18next";
import type { CarInput } from "../api/types";
import {
  useAddCarPhoto,
  useCar,
  useDeleteCar,
  useDeleteCarPhoto,
  useImportCarPhotoFromWiki,
  useSetCarPhotoPrimary,
  useUpdateCar,
} from "../hooks/useCars";
import { versionToFormValues } from "../utils/catalog";
import { navState, useEditReturn } from "../utils/navState";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import CarForm, { carToFormValues, type CarFormValues } from "./CarForm";
import CatalogMatchDialog from "./CatalogMatchDialog";
import ConfirmDialog from "./ConfirmDialog";
import { EmptyState } from "./ListViews";
import Page, { ToolbarButton, ToolbarDivider } from "./Page";
import PhotoGallery from "./PhotoGallery";

const EditCarPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // "Match to wiki" on the vehicle's page lands here with the match dialog already open. The
  // flag is used once, then dropped from history, so coming back to this entry later doesn't
  // open the dialog again.
  const location = useLocation();
  const openMatch = Boolean(navState(location)?.openMatch);
  useEffect(() => {
    if (openMatch) {
      navigate(location.pathname, {
        replace: true,
        state: { ...navState(location), openMatch: false },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const carId = Number(id);
  const returnToItem = useEditReturn(`/collection/vehicles/${carId}`);
  const { data: car, isLoading } = useCar(Number.isFinite(carId) ? carId : undefined);
  const updateCar = useUpdateCar(carId);
  const deleteCar = useDeleteCar();
  const importPhoto = useImportCarPhotoFromWiki(carId);
  const addPhoto = useAddCarPhoto(carId);
  const deletePhoto = useDeleteCarPhoto(carId);
  const setPrimaryPhoto = useSetCarPhotoPrimary(carId);
  const [matchOpen, setMatchOpen] = useState(openMatch);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // A catalog match is applied to the form, not saved — the user reviews it and saves as
  // usual. Bumping the key remounts CarForm so it picks up the merged values.
  const [matchedValues, setMatchedValues] = useState<CarFormValues | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (input: CarInput) => {
    try {
      await updateCar.mutateAsync(input);
      toast.success(t("vehicles.updated"), TOAST_OPTIONS);
      returnToItem();
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
      navigate("/collection/vehicles", { replace: true });
    } catch (error) {
      console.error("Error deleting car:", error);
      toast.error(t("vehicles.deleteError"), TOAST_OPTIONS);
    }
  };

  const listCrumbs = [
    { label: t("nav.collection") },
    { label: t("vehicles.title"), to: "/collection/vehicles" },
  ];
  if (isLoading || !car) {
    return (
      <Page crumbs={listCrumbs}>
        <EmptyState>{isLoading ? t("common.loading") : t("vehicles.notFound")}</EmptyState>
      </Page>
    );
  }

  const formValues = matchedValues ?? carToFormValues(car);

  return (
    <Page
      crumbs={[
        ...listCrumbs,
        { label: car.name, to: `/collection/vehicles/${car.id}` },
        { label: t("detail.edit") },
      ]}
      toolbar={
        <>
          <ToolbarButton
            icon={<ArrowBackIcon />}
            label={car.name}
            onClick={returnToItem}
            sx={{
              maxWidth: 260,
              "& > span:last-of-type": { overflow: "hidden", textOverflow: "ellipsis" },
            }}
          />
          <ToolbarDivider />
          <ToolbarButton
            icon={<MenuBookIcon />}
            label={car.catalogTitle ? t("detail.rematch") : t("detail.match")}
            onClick={() => setMatchOpen(true)}
          />
        </>
      }
      toolbarEnd={
        <ToolbarButton
          icon={<DeleteIcon />}
          label={t("common.delete")}
          danger
          disabled={deleteCar.isPending}
          onClick={() => setConfirmDeleteOpen(true)}
        />
      }
    >
      <Stack spacing={2}>
        <CarForm
          key={formKey}
          initialValues={formValues}
          submitLabel={t("common.saveChanges")}
          onSubmit={handleSubmit}
          showPhotoUpload={false}
        />
        <PhotoGallery
          photos={car.photos}
          photoAlt={t("gallery.vehiclePhoto")}
          addPhoto={addPhoto}
          deletePhoto={deletePhoto}
          setPrimary={setPrimaryPhoto}
        />
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
    </Page>
  );
};

export default EditCarPage;
