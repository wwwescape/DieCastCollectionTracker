import { apiClient } from "./client";
import {
  LIST_PARAMS_SERIALIZER,
  type BulkEditInput,
  type BulkResult,
  type ItemSource,
} from "./listFilters";
import type { CarCondition, CarPhoto, CarSet, CarStatus, SetInput, SetType } from "./types";

export interface SetListParams {
  search?: string;
  // A single value or several; see api/listFilters.ts.
  status?: CarStatus | CarStatus[];
  statusExclude?: boolean;
  setType?: SetType | SetType[];
  setTypeExclude?: boolean;
  manufacturerId?: number | number[];
  manufacturerExclude?: boolean;
  seriesId?: number | number[];
  seriesExclude?: boolean;
  condition?: CarCondition[];
  conditionExclude?: boolean;
  sealed?: SealedState[];
  sealedExclude?: boolean;
  tagId?: number | number[];
  tagExclude?: boolean;
  tagMatchAll?: boolean;
  source?: ItemSource[];
  sourceExclude?: boolean;
  sort?: string;
  order?: "asc" | "desc";
}

export type SealedState = "sealed" | "opened";

export async function listSets(params: SetListParams = {}): Promise<CarSet[]> {
  return (
    await apiClient.get<CarSet[]>("/api/sets", { params, paramsSerializer: LIST_PARAMS_SERIALIZER })
  ).data;
}

export async function getSet(id: number): Promise<CarSet> {
  return (await apiClient.get<CarSet>(`/api/sets/${id}`)).data;
}

export async function createSet(input: SetInput): Promise<CarSet> {
  return (await apiClient.post<CarSet>("/api/sets", input)).data;
}

export async function updateSet(id: number, input: Partial<SetInput>): Promise<CarSet> {
  return (await apiClient.patch<CarSet>(`/api/sets/${id}`, input)).data;
}

export async function deleteSet(id: number): Promise<void> {
  await apiClient.delete(`/api/sets/${id}`);
}

// --- Photo gallery (mirrors api/cars.ts) ---

export async function addSetPhoto(setId: number, file: File): Promise<CarPhoto> {
  const formData = new FormData();
  formData.append("file", file);
  return (await apiClient.post<CarPhoto>(`/api/sets/${setId}/photos`, formData)).data;
}

export async function deleteSetPhoto(setId: number, photoId: number): Promise<void> {
  await apiClient.delete(`/api/sets/${setId}/photos/${photoId}`);
}

export async function setSetPhotoPrimary(setId: number, photoId: number): Promise<CarPhoto> {
  return (await apiClient.patch<CarPhoto>(`/api/sets/${setId}/photos/${photoId}/primary`)).data;
}

// --- Bulk actions (Sets list selection mode) ---

export async function bulkEditSets(input: BulkEditInput): Promise<BulkResult> {
  return (await apiClient.post<BulkResult>("/api/sets/bulk-edit", input)).data;
}

export async function bulkDeleteSets(ids: number[]): Promise<BulkResult> {
  return (await apiClient.post<BulkResult>("/api/sets/bulk-delete", { ids })).data;
}
