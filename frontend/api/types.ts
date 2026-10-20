import type { CatalogSourceId } from "./catalog";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface CurrentUser {
  id: number;
  username: string;
}

export interface SetupStatus {
  setupRequired: boolean;
}

export interface NamedLookup {
  id: number;
  name: string;
}

export interface Series {
  id: number;
  name: string;
  manufacturerId: number | null;
  manufacturerName: string | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export type CarStatus = "owned" | "wishlist";

export type CarCondition = "mint_in_box" | "near_mint" | "good" | "fair" | "poor";

// Labels live in locales/*/translation.json under "conditions".
export const CAR_CONDITIONS: CarCondition[] = ["mint_in_box", "near_mint", "good", "fair", "poor"];

export interface CarPhoto {
  id: number;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

// A vehicle as listed on a set, or a set as listed on a vehicle.
export interface LinkedItem {
  id: number;
  name: string;
  manufacturerName: string;
  year: number | null;
  photo: string | null;
}

export interface Car {
  id: number;
  name: string;
  manufacturerId: number;
  manufacturerName: string;
  seriesId: number | null;
  seriesName: string | null;
  vehicleTypeId: number | null;
  vehicleTypeName: string | null;
  colorId: number | null;
  colorName: string | null;
  castNumber: string | null;
  collectionNumber: string | null;
  year: number | null;
  status: CarStatus;
  condition: CarCondition | null;
  quantity: number;
  purchasePrice: number | null;
  notes: string | null;
  catalogSource: CatalogSourceId | null;
  catalogTitle: string | null;
  catalogUrl: string | null;
  photo: string | null;
  photos: CarPhoto[];
  tags: Tag[];
  // Sets this vehicle is linked to.
  sets: LinkedItem[];
}

export interface CarInput {
  name: string;
  manufacturer: string;
  series: string | null;
  vehicleType: string | null;
  color: string | null;
  castNumber: string | null;
  collectionNumber: string | null;
  year: number | null;
  status: CarStatus;
  condition: CarCondition | null;
  quantity: number;
  purchasePrice: number | null;
  notes: string | null;
  catalogSource: CatalogSourceId | null;
  catalogTitle: string | null;
  photo?: string | null;
  tags: string[];
  setIds: number[];
}

// Playsets and track sets only — multi-packs and gift packs are tracked car by car.
export type SetType = "playset" | "track_set";

// Labels live in locales/*/translation.json under "setTypes".
export const SET_TYPES: SetType[] = ["playset", "track_set"];

export interface CarSet {
  id: number;
  name: string;
  manufacturerId: number;
  manufacturerName: string;
  seriesId: number | null;
  seriesName: string | null;
  setType: SetType;
  toyNumber: string | null;
  year: number | null;
  status: CarStatus;
  condition: CarCondition | null;
  sealed: boolean;
  quantity: number;
  purchasePrice: number | null;
  notes: string | null;
  // Primary photo; the whole gallery is in `photos`.
  photo: string | null;
  photos: CarPhoto[];
  tags: Tag[];
  // The wiki's list of vehicles that came with it, e.g. "Backdrafter (Red)".
  contents: string[];
  // Vehicles in the collection linked to this set.
  vehicles: LinkedItem[];
  catalogSource: CatalogSourceId | null;
  catalogTitle: string | null;
  catalogUrl: string | null;
}

export interface SetInput {
  name: string;
  manufacturer: string;
  series: string | null;
  setType: SetType;
  toyNumber: string | null;
  year: number | null;
  status: CarStatus;
  condition: CarCondition | null;
  sealed: boolean;
  quantity: number;
  purchasePrice: number | null;
  notes: string | null;
  // Initial photo when creating; afterwards the gallery is managed on the edit page.
  photo?: string | null;
  tags: string[];
  contents: string[];
  vehicleIds: number[];
  catalogSource: CatalogSourceId | null;
  catalogTitle: string | null;
}

export interface VersionInfo {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
}
