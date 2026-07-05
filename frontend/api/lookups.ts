import { apiClient } from "./client";
import type { NamedLookup, Series } from "./types";

export async function listManufacturers(): Promise<NamedLookup[]> {
  return (await apiClient.get<NamedLookup[]>("/api/manufacturers")).data;
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

export async function createSeries(name: string, manufacturer: string | null): Promise<Series> {
  return (await apiClient.post<Series>("/api/series", { name, manufacturer })).data;
}

export async function deleteSeries(id: number): Promise<void> {
  await apiClient.delete(`/api/series/${id}`);
}
