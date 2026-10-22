import { apiClient } from "./client";
import type { Tag } from "./types";

export async function listTags(): Promise<Tag[]> {
  return (await apiClient.get<Tag[]>("/api/tags")).data;
}

export async function createTag(name: string, color: string | null = null): Promise<Tag> {
  return (await apiClient.post<Tag>("/api/tags", { name, color })).data;
}

export async function deleteTag(id: number): Promise<void> {
  await apiClient.delete(`/api/tags/${id}`);
}

export interface TagCoverage extends Tag {
  // How many of the selected vehicles/sets carry this tag.
  count: number;
}

export async function getTagCoverage(
  vehicleIds: number[],
  setIds: number[] = []
): Promise<TagCoverage[]> {
  return (await apiClient.post<TagCoverage[]>("/api/tags/coverage", { vehicleIds, setIds })).data;
}
