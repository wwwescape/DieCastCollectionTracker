import { publicClient } from "./publicClient";
import type { Car, CarSet } from "./types";

// What a share-link visitor sees: catalog facts and a photo, none of the owner's own data
// (purchase price, notes, tags). See backend app/schemas/public.py.
export type PublicCar = Pick<
  Car,
  | "id"
  | "name"
  | "manufacturerName"
  | "seriesName"
  | "vehicleTypeName"
  | "colorName"
  | "castNumber"
  | "collectionNumber"
  | "year"
  | "status"
  | "condition"
  | "quantity"
  | "photo"
>;

export type PublicSet = Pick<
  CarSet,
  | "id"
  | "name"
  | "manufacturerName"
  | "setType"
  | "toyNumber"
  | "year"
  | "status"
  | "sealed"
  | "quantity"
  | "photo"
  | "contents"
>;

export async function listPublicCars(token: string, search?: string): Promise<PublicCar[]> {
  return (await publicClient.get<PublicCar[]>(`/api/public/${token}/cars`, { params: { search } }))
    .data;
}

export async function listPublicSets(token: string, search?: string): Promise<PublicSet[]> {
  return (await publicClient.get<PublicSet[]>(`/api/public/${token}/sets`, { params: { search } }))
    .data;
}
