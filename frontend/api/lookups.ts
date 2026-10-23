import { apiClient } from "./client";
import type { NamedLookup, Series } from "./types";

export interface ManufacturerOverview {
  id: number;
  name: string;
  carCount: number;
  setCount: number;
}

export async function listManufacturers(): Promise<NamedLookup[]> {
  return (await apiClient.get<NamedLookup[]>("/api/manufacturers")).data;
}

export async function listManufacturerOverview(): Promise<ManufacturerOverview[]> {
  return (await apiClient.get<ManufacturerOverview[]>("/api/manufacturers/overview")).data;
}

export async function createManufacturer(name: string): Promise<NamedLookup> {
  return (await apiClient.post<NamedLookup>("/api/manufacturers", { name })).data;
}

export async function deleteManufacturer(id: number): Promise<void> {
  await apiClient.delete(`/api/manufacturers/${id}`);
}

export async function listVehicleTypes(): Promise<NamedLookup[]> {
  return (await apiClient.get<NamedLookup[]>("/api/vehicle-types")).data;
}

export async function createVehicleType(name: string): Promise<NamedLookup> {
  return (await apiClient.post<NamedLookup>("/api/vehicle-types", { name })).data;
}

export async function deleteVehicleType(id: number): Promise<void> {
  await apiClient.delete(`/api/vehicle-types/${id}`);
}

export async function listColors(): Promise<NamedLookup[]> {
  return (await apiClient.get<NamedLookup[]>("/api/colors")).data;
}

export async function createColor(name: string): Promise<NamedLookup> {
  return (await apiClient.post<NamedLookup>("/api/colors", { name })).data;
}

export async function deleteColor(id: number): Promise<void> {
  await apiClient.delete(`/api/colors/${id}`);
}

export async function listSeries(manufacturerId?: number): Promise<Series[]> {
  return (await apiClient.get<Series[]>("/api/series", { params: { manufacturerId } })).data;
}

// One row per series and year: the same name is reused for a different pack every year (e.g.
// Batman 5-Pack), so each year is listed on its own. Null for items without a year.
export interface SeriesOverview extends Series {
  year: number | null;
  carCount: number;
  setCount: number;
}

export async function listSeriesOverview(): Promise<SeriesOverview[]> {
  return (await apiClient.get<SeriesOverview[]>("/api/series/overview")).data;
}

export async function createSeries(name: string, manufacturer: string | null): Promise<Series> {
  return (await apiClient.post<Series>("/api/series", { name, manufacturer })).data;
}

export async function deleteSeries(id: number): Promise<void> {
  await apiClient.delete(`/api/series/${id}`);
}

// --- Settings → Lookups: usage, rename, merge (backend app/services/lookup_service.py) ---

export type LookupKind = "manufacturers" | "series" | "vehicle-types" | "colors" | "tags";

export interface LookupUsage {
  id: number;
  carCount: number;
  setCount: number;
  // Used by a wiki-matched vehicle or set: renaming or merging it away isn't allowed.
  wikiBacked: boolean;
}

export interface LookupsUsage {
  manufacturers: LookupUsage[];
  series: LookupUsage[];
  vehicleTypes: LookupUsage[];
  colors: LookupUsage[];
  tags: LookupUsage[];
}

export interface LookupEntry {
  id: number;
  name: string;
  color: string | null;
}

export async function getLookupsUsage(): Promise<LookupsUsage> {
  return (await apiClient.get<LookupsUsage>("/api/lookups/usage")).data;
}

// `color` is only sent for tags; leave it out to keep the tag's current color.
export async function renameLookup(
  kind: LookupKind,
  id: number,
  body: { name: string; color?: string | null }
): Promise<LookupEntry> {
  return (await apiClient.patch<LookupEntry>(`/api/lookups/${kind}/${id}`, body)).data;
}

export async function mergeLookup(
  kind: LookupKind,
  id: number,
  intoId: number
): Promise<LookupEntry> {
  return (await apiClient.post<LookupEntry>(`/api/lookups/${kind}/${id}/merge`, { intoId })).data;
}
