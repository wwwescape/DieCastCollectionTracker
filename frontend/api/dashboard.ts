import { apiClient } from "./client";
import type { Car } from "./types";

export interface ManufacturerStat {
  manufacturerName: string;
  carCount: number;
}

export interface VehicleTypeStat {
  vehicleTypeName: string;
  carCount: number;
}

export interface DashboardStats {
  totalCars: number;
  totalQuantity: number;
  ownedCount: number;
  wishlistCount: number;
  byManufacturer: ManufacturerStat[];
  byVehicleType: VehicleTypeStat[];
  recentlyAdded: Car[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return (await apiClient.get<DashboardStats>("/api/dashboard")).data;
}
