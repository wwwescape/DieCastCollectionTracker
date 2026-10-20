import { apiClient } from "./client";
import type { CarPhoto, CarSet, CarStatus, SetInput, SetType } from "./types";

export interface SetListParams {
  search?: string;
  manufacturerId?: number;
  seriesId?: number;
  setType?: SetType;
  status?: CarStatus;
  sort?: string;
  order?: "asc" | "desc";
}

export async function listSets(params: SetListParams = {}): Promise<CarSet[]> {
  return (await apiClient.get<CarSet[]>("/api/sets", { params })).data;
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
