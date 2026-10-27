import { API_BASE_URL, apiClient } from "./client";

export interface BackupRestoreResult {
  restoredCars: number;
  restoredSets: number;
  // Photo files copied in from a .zip backup (0 for a .json one).
  restoredPhotos: number;
  safetySnapshotPath: string;
}

// Data only: every vehicle, set, lookup and tag, with photo URLs but not the photo files.
export async function exportBackupBlob(): Promise<Blob> {
  const response = await apiClient.get("/api/export/backup", { responseType: "blob" });
  return response.data as Blob;
}

// The full backup (.zip with photos) can be large, so the browser downloads it itself from a
// short-lived signed link instead of the page holding it in memory.
export async function fullBackupDownloadUrl(): Promise<string> {
  const response = await apiClient.post<{ url: string }>("/api/export/backup/full-link");
  return `${API_BASE_URL}${response.data.url}`;
}

// A .json or a .zip backup; the server tells them apart.
export async function restoreBackup(file: File): Promise<BackupRestoreResult> {
  const formData = new FormData();
  formData.append("file", file);
  return (await apiClient.post<BackupRestoreResult>("/api/import/backup", formData)).data;
}
