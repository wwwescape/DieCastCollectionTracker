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
