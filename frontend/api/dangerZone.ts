import { apiClient } from "./client";

export type DangerZoneAction =
  | "clear_notes"
  | "clear_tags"
  | "clear_purchase_prices"
  | "remove_unused_lookups"
  | "remove_unused_photos"
  | "reset_vehicles"
  | "reset_sets"
  | "reset_everything";

export interface DangerZoneResult {
  // How many of each kind were removed, e.g. { vehicles: 12 }.
  removed: Record<string, number>;
  // File name of the pre-reset safety snapshot on the server (resets only).
  safetySnapshotPath: string | null;
}

// The resets need "RESET" typed as `confirmation`; the other actions don't.
export async function runDangerZoneAction(
  action: DangerZoneAction,
  confirmation?: string
): Promise<DangerZoneResult> {
  const response = await apiClient.post<DangerZoneResult>(`/api/danger-zone/${action}`, {
    confirmation,
  });
  return response.data;
}
