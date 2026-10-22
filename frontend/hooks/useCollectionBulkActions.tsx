import { useState, type ReactNode } from "react";
import { toast } from "react-toastify";
import LabelIcon from "@mui/icons-material/Label";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import ViewListIcon from "@mui/icons-material/ViewList";
import { useTranslation } from "react-i18next";
import type { BulkEditInput } from "../api/listFilters";
import BulkEditDialog, { type BulkEditField } from "../components/BulkEditDialog";
import type { BulkAction } from "../components/CollectionListToolbar";
import ConfirmDialog from "../components/ConfirmDialog";
import ManageTagsDialog from "../components/ManageTagsDialog";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import { useBulkDeleteCars, useBulkEditCars } from "./useCars";
import { useBulkDeleteSets, useBulkEditSets } from "./useSets";

type BulkChange = Omit<BulkEditInput, "ids">;

// Everything behind the selection bar on the Vehicles and Sets lists: Remove (with a
// confirmation, like a single delete) and the ▾ menu's Tags, Set status, Set condition and
// Set series, each applied to every selected item in one request.
export function useCollectionBulkActions(
  kind: "vehicles" | "sets",
  selectedIds: number[],
  onDone: () => void
): { bulkActions: BulkAction[]; onBulkDelete: () => void; dialogs: ReactNode } {
  const { t } = useTranslation();
  const editCars = useBulkEditCars();
  const deleteCars = useBulkDeleteCars();
  const editSets = useBulkEditSets();
  const deleteSets = useBulkDeleteSets();
  const edit = kind === "vehicles" ? editCars : editSets;
  const remove = kind === "vehicles" ? deleteCars : deleteSets;

  const [tagsOpen, setTagsOpen] = useState(false);
  const [editField, setEditField] = useState<BulkEditField | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const applyEdit = async (change: BulkChange) => {
    try {
      const result = await edit.mutateAsync({ ids: selectedIds, ...change });
      toast.success(t("bulk.updated", { count: result.count }), TOAST_OPTIONS);
      setTagsOpen(false);
      setEditField(null);
      onDone();
    } catch (error) {
      console.error("Error applying bulk change:", error);
      toast.error(t("bulk.updateError"), TOAST_OPTIONS);
    }
  };

  const applyRemove = async () => {
    setConfirmOpen(false);
    try {
      const result = await remove.mutateAsync(selectedIds);
      toast.success(t("bulk.removed", { count: result.count }), TOAST_OPTIONS);
      onDone();
    } catch (error) {
      console.error("Error removing items:", error);
      toast.error(t("bulk.removeError"), TOAST_OPTIONS);
    }
  };

  const bulkActions: BulkAction[] = [
    {
      key: "tags",
      label: t("bulk.tags"),
      icon: <LabelIcon fontSize="small" />,
      onClick: () => setTagsOpen(true),
    },
    {
      key: "status",
      label: t("bulk.setStatus"),
      icon: <PlaylistAddCheckIcon fontSize="small" />,
      onClick: () => setEditField("status"),
    },
    {
      key: "condition",
      label: t("bulk.setCondition"),
      icon: <StarHalfIcon fontSize="small" />,
      onClick: () => setEditField("condition"),
    },
    {
      key: "series",
      label: t("bulk.setSeries"),
      icon: <ViewListIcon fontSize="small" />,
      onClick: () => setEditField("series"),
    },
  ];

  const dialogs = (
    <>
      <ManageTagsDialog
        open={tagsOpen}
        vehicleIds={kind === "vehicles" ? selectedIds : []}
        setIds={kind === "sets" ? selectedIds : []}
        busy={edit.isPending}
        onClose={() => setTagsOpen(false)}
        onApply={(change) => void applyEdit(change)}
      />
      <BulkEditDialog
        field={editField}
        count={selectedIds.length}
        busy={edit.isPending}
        onClose={() => setEditField(null)}
        onApply={(change) => void applyEdit(change)}
      />
      <ConfirmDialog
        open={confirmOpen}
        title={t("bulk.removeTitle", { count: selectedIds.length })}
        description={t("bulk.removeDescription")}
        confirmLabel={t("listToolbar.remove")}
        confirmColor="error"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void applyRemove()}
      />
    </>
  );

  return { bulkActions, onBulkDelete: () => setConfirmOpen(true), dialogs };
}
