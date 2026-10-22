import { apiClient } from "./client";
import {
  LIST_PARAMS_SERIALIZER,
  type BulkEditInput,
  type BulkResult,
  type ItemSource,
} from "./listFilters";
import type { Car, CarCondition, CarInput, CarPhoto, CarStatus } from "./types";

export interface CarListParams {
  search?: string;
  // A single value or several; see api/listFilters.ts.
  status?: CarStatus | CarStatus[];
  statusExclude?: boolean;
  manufacturerId?: number | number[];
  manufacturerExclude?: boolean;
  seriesId?: number | number[];
  seriesExclude?: boolean;
  vehicleTypeId?: number | number[];
  vehicleTypeExclude?: boolean;
  colorId?: number | number[];
  colorExclude?: boolean;
  condition?: CarCondition[];
  conditionExclude?: boolean;
  tagId?: number | number[];
  tagExclude?: boolean;
  tagMatchAll?: boolean;
  source?: ItemSource[];
  sourceExclude?: boolean;
  sort?: string;
  order?: "asc" | "desc";
}

export async function listCars(params: CarListParams = {}): Promise<Car[]> {
  return (
    await apiClient.get<Car[]>("/api/cars", { params, paramsSerializer: LIST_PARAMS_SERIALIZER })
  ).data;
}

export async function getCar(id: number): Promise<Car> {
  return (await apiClient.get<Car>(`/api/cars/${id}`)).data;
}

export interface CarBulkItem extends CarInput {
  // A wiki image the server copies in as the primary photo (see POST /api/cars/bulk).
  wikiPhotoUrl?: string | null;
}

export interface CarBulkResult {
  cars: Car[];
  photosFailed: number;
}

export async function createCarsBulk(cars: CarBulkItem[]): Promise<CarBulkResult> {
  return (await apiClient.post<CarBulkResult>("/api/cars/bulk", { cars })).data;
}

export async function createCar(input: CarInput): Promise<Car> {
  return (await apiClient.post<Car>("/api/cars", input)).data;
}

export async function updateCar(id: number, input: Partial<CarInput>): Promise<Car> {
  return (await apiClient.patch<Car>(`/api/cars/${id}`, input)).data;
}

export async function deleteCar(id: number): Promise<void> {
  await apiClient.delete(`/api/cars/${id}`);
}

// --- Photo gallery ---

export async function addCarPhoto(carId: number, file: File): Promise<CarPhoto> {
  const formData = new FormData();
  formData.append("file", file);
  return (await apiClient.post<CarPhoto>(`/api/cars/${carId}/photos`, formData)).data;
}

export async function deleteCarPhoto(carId: number, photoId: number): Promise<void> {
  await apiClient.delete(`/api/cars/${carId}/photos/${photoId}`);
}

export async function setCarPhotoPrimary(carId: number, photoId: number): Promise<CarPhoto> {
  return (await apiClient.patch<CarPhoto>(`/api/cars/${carId}/photos/${photoId}/primary`)).data;
}

// --- Bulk actions (Vehicles list selection mode) ---

export async function bulkEditCars(input: BulkEditInput): Promise<BulkResult> {
  return (await apiClient.post<BulkResult>("/api/cars/bulk-edit", input)).data;
}

export async function bulkDeleteCars(ids: number[]): Promise<BulkResult> {
  return (await apiClient.post<BulkResult>("/api/cars/bulk-delete", { ids })).data;
}
