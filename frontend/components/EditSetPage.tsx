import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useTranslation } from "react-i18next";
import type { SetInput } from "../api/types";
import { useDeleteSet, useSet, useUpdateSet } from "../hooks/useSets";
import { CATALOG_SOURCE_LABELS } from "../utils/catalog";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import ConfirmDialog from "./ConfirmDialog";
import SetForm, { setToFormValues } from "./SetForm";

const EditSetPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const setId = Number(id);
  const { data: set, isLoading } = useSet(Number.isFinite(setId) ? setId : undefined);
  const updateSet = useUpdateSet(setId);
  const deleteSet = useDeleteSet();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleSubmit = async (input: SetInput) => {
    try {
      await updateSet.mutateAsync(input);
      toast.success(t("sets.updated"), TOAST_OPTIONS);
      navigate("/collection/sets");
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
      navigate("/collection/sets");
    } catch (error) {
      console.error("Error deleting set:", error);
      toast.error(t("sets.deleteError"), TOAST_OPTIONS);
    }
  };

  if (isLoading) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>;
  }
  if (!set) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>{t("sets.notFound")}</Paper>;
  }

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
          {t("sets.editSet")}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          {set.catalogUrl && set.catalogSource ? (
            <Button
              variant="outlined"
              endIcon={<OpenInNewIcon />}
              href={set.catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("common.viewOnWiki", { wiki: CATALOG_SOURCE_LABELS[set.catalogSource] })}
            </Button>
          ) : null}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={deleteSet.isPending}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            {t("common.delete")}
          </Button>
        </Stack>
      </Stack>
      <SetForm
        initialValues={setToFormValues(set)}
        submitLabel={t("common.saveChanges")}
        onSubmit={handleSubmit}
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
    </>
  );
};

export default EditSetPage;
