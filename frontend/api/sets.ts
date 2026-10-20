import { apiClient } from "./client";
import type { CarSet, CarStatus, SetInput, SetType } from "./types";

export interface SetListParams {
  search?: string;
  manufacturerId?: number;
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
