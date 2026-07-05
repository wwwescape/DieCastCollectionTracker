import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { exportBackupBlob, exportCsvBlob, restoreBackup } from "../api/importExport";
import { downloadBlob } from "../utils/download";

export function useExportCsv() {
  return useMutation({
    mutationFn: async () => {
      const blob = await exportCsvBlob();
      downloadBlob(blob, "diecast-collection.csv");
    },
  });
}

export function useExportBackup() {
  return useMutation({
    mutationFn: async () => {
      const blob = await exportBackupBlob();
      downloadBlob(blob, "diecast-backup.json");
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
      toast.success(`Restored ${result.restoredCars} car(s) from backup.`);
    },
  });
}
