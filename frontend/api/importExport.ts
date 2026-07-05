import { apiClient } from "./client";

export interface BackupRestoreResult {
  restoredCars: number;
  safetySnapshotPath: string;
}

export async function exportCsvBlob(): Promise<Blob> {
  const response = await apiClient.get("/api/export/csv", { responseType: "blob" });
  return response.data as Blob;
}

export async function exportBackupBlob(): Promise<Blob> {
  const response = await apiClient.get("/api/export/backup", { responseType: "blob" });
  return response.data as Blob;
}

export async function restoreBackup(file: File): Promise<BackupRestoreResult> {
  const formData = new FormData();
  formData.append("file", file);
  return (await apiClient.post<BackupRestoreResult>("/api/import/backup", formData)).data;
}
