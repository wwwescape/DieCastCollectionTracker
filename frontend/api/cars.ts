import { apiClient } from "./client";
import type { Car, CarInput, CarPhoto, CarStatus } from "./types";

export interface CarListParams {
  search?: string;
  manufacturerId?: number;
  seriesId?: number;
  vehicleTypeId?: number;
  colorId?: number;
  status?: CarStatus;
  tagId?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export async function listCars(params: CarListParams = {}): Promise<Car[]> {
  return (await apiClient.get<Car[]>("/api/cars", { params })).data;
}

export async function getCar(id: number): Promise<Car> {
  return (await apiClient.get<Car>(`/api/cars/${id}`)).data;
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
