import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18next from "i18next";
import { toast } from "react-toastify";
import { exportBackupBlob, fullBackupDownloadUrl, restoreBackup } from "../api/importExport";
import { downloadBlob, downloadUrl } from "../utils/download";
import { TOAST_OPTIONS } from "../utils/toastOptions";

export type BackupFormat = "zip" | "json";

export function useExportBackup() {
  return useMutation({
    mutationFn: async (format: BackupFormat) => {
      if (format === "zip") {
        downloadUrl(await fullBackupDownloadUrl());
      } else {
        downloadBlob(await exportBackupBlob(), "diecast-backup.json");
      }
    },
  });
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreBackup,
    // File variables can't survive the offline persister's JSON serialization, and restore
    // is a destructive wipe-and-replace that should never be silently queued for later —
    // 'always' runs (or fails) immediately regardless of connectivity.
    networkMode: "always",
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      toast.success(
        i18next.t(
          result.restoredPhotos ? "settings.data.restoredWithPhotos" : "settings.data.restored",
          {
            cars: result.restoredCars,
            sets: result.restoredSets,
            photos: result.restoredPhotos,
          }
        ),
        TOAST_OPTIONS
      );
    },
  });
}
