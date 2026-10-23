import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useTranslation } from "react-i18next";
import type { SetInput } from "../api/types";
import {
  useAddSetPhoto,
  useDeleteSet,
  useDeleteSetPhoto,
  useSet,
  useImportSetPhotoFromWiki,
  useSetSetPhotoPrimary,
  useUpdateSet,
} from "../hooks/useSets";
import { useCollectionIndex } from "../hooks/useCollectionIndex";
import { CATALOG_SOURCE_LABELS, catalogSetToFormValues } from "../utils/catalog";
import { vehicleIdsNamed } from "../utils/collectionIndex";
import { navState, useEditReturn } from "../utils/navState";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import ConfirmDialog from "./ConfirmDialog";
import { EmptyState } from "./ListViews";
import Page, { ToolbarButton, ToolbarDivider } from "./Page";
import PhotoGallery from "./PhotoGallery";
import SetCatalogMatchDialog from "./SetCatalogMatchDialog";
import SetForm, { setToFormValues, type SetFormValues } from "./SetForm";

const EditSetPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const setId = Number(id);
  const returnToItem = useEditReturn(`/collection/sets/${setId}`);
  const { data: set, isLoading } = useSet(Number.isFinite(setId) ? setId : undefined);
  const updateSet = useUpdateSet(setId);
  const deleteSet = useDeleteSet();
  const addPhoto = useAddSetPhoto(setId);
  const deletePhoto = useDeleteSetPhoto(setId);
  const setPrimaryPhoto = useSetSetPhotoPrimary(setId);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const importPhoto = useImportSetPhotoFromWiki(setId);
  const collection = useCollectionIndex();
  // "Match to wiki" on the set's page lands here with the dialog open; the flag is used once
  // and dropped from history (see EditCarPage).
  const location = useLocation();
  const openMatch = Boolean(navState(location)?.openMatch);
  const [matchOpen, setMatchOpen] = useState(openMatch);
  useEffect(() => {
    if (openMatch) {
      navigate(location.pathname, {
        replace: true,
        state: { ...navState(location), openMatch: false },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // A match fills the form for review, it isn't saved; the key remounts SetForm with it.
  const [matchedValues, setMatchedValues] = useState<SetFormValues | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (input: SetInput) => {
    try {
      await updateSet.mutateAsync(input);
      toast.success(t("sets.updated"), TOAST_OPTIONS);
      returnToItem();
    } catch (error) {
      console.error("Error updating set:", error);
      toast.error(t("sets.updateError"), TOAST_OPTIONS);
    }
  };

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await deleteSet.mutateAsync(setId);
      toast.success(t("sets.deleted", { name: set?.name }), TOAST_OPTIONS);
      navigate("/collection/sets", { replace: true });
    } catch (error) {
      console.error("Error deleting set:", error);
      toast.error(t("sets.deleteError"), TOAST_OPTIONS);
    }
  };

  const listCrumbs = [
    { label: t("nav.collection") },
    { label: t("sets.title"), to: "/collection/sets" },
  ];
  if (isLoading || !set) {
    return (
      <Page crumbs={listCrumbs}>
        <EmptyState>{isLoading ? t("common.loading") : t("sets.notFound")}</EmptyState>
      </Page>
    );
  }

  const formValues = matchedValues ?? setToFormValues(set);

  return (
    <Page
      crumbs={[
        ...listCrumbs,
        { label: set.name, to: `/collection/sets/${set.id}` },
        { label: t("detail.edit") },
      ]}
      toolbar={
        <>
          <ToolbarButton
            icon={<ArrowBackIcon />}
            label={set.name}
            onClick={returnToItem}
            sx={{
              maxWidth: 260,
              "& > span:last-of-type": { overflow: "hidden", textOverflow: "ellipsis" },
            }}
          />
          <ToolbarDivider />
          <ToolbarButton
            icon={<MenuBookIcon />}
            label={set.catalogTitle ? t("detail.rematch") : t("detail.match")}
            onClick={() => setMatchOpen(true)}
          />
          {set.catalogUrl && set.catalogSource ? (
            <>
              <ToolbarDivider />
              <ToolbarButton
                icon={<OpenInNewIcon />}
                label={CATALOG_SOURCE_LABELS[set.catalogSource]}
                href={set.catalogUrl}
              />
            </>
          ) : null}
        </>
      }
      toolbarEnd={
        <ToolbarButton
          icon={<DeleteIcon />}
          label={t("common.delete")}
          danger
          disabled={deleteSet.isPending}
          onClick={() => setConfirmDeleteOpen(true)}
        />
      }
    >
      <Stack spacing={2}>
        <SetForm
          key={formKey}
          initialValues={formValues}
          submitLabel={t("common.saveChanges")}
          onSubmit={handleSubmit}
          showPhotoUpload={false}
        />
        <PhotoGallery
          photos={set.photos}
          photoAlt={t("gallery.setPhoto")}
          addPhoto={addPhoto}
          deletePhoto={deletePhoto}
          setPrimary={setPrimaryPhoto}
        />
      </Stack>
      <SetCatalogMatchDialog
        open={matchOpen}
        initialQuery={set.toyNumber || set.name}
        busy={importPhoto.isPending}
        onClose={() => setMatchOpen(false)}
        onMatch={async ({ set: picked, addPhoto }) => {
          // Keep the user's own fields (status, condition, price, notes, tags...) and the
          // vehicles already linked; the wiki fills in the catalog facts and links any of the
          // set's vehicles that are in the collection too.
          const linked = vehicleIdsNamed(
            collection,
            picked.cars.map((car) => car.name)
          );
          setMatchedValues({
            ...formValues,
            ...catalogSetToFormValues(picked),
            vehicleIds: [...new Set([...formValues.vehicleIds, ...linked])],
          });
          setFormKey((key) => key + 1);
          setMatchOpen(false);
          toast.info(t("sets.matchFilled"), TOAST_OPTIONS);
          if (addPhoto && picked.imageUrl) {
            try {
              await importPhoto.mutateAsync(picked.imageUrl);
            } catch (error) {
              console.error("Error importing wiki photo:", error);
              toast.warn(t("vehicles.matchPhotoError"), TOAST_OPTIONS);
            }
          }
        }}
      />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t("sets.deleteConfirmTitle")}
        description={t("sets.deleteConfirmDescription", { name: set.name })}
        confirmLabel={t("common.delete")}
        confirmColor="error"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </Page>
  );
};

export default EditSetPage;
