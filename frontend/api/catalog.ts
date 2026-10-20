import { apiClient } from "./client";
import type { CarPhoto, SetType } from "./types";

export type CatalogSourceId = "hotwheels" | "matchbox";
export type CatalogSearchSource = CatalogSourceId | "all";

export interface CatalogCastingSummary {
  source: CatalogSourceId;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface CatalogVersion {
  collectorNumber: string | null;
  year: number | null;
  series: string | null;
  seriesNumber: string | null;
  color: string | null;
  tampo: string | null;
  toyNumbers: string[];
  notes: string | null;
  photoUrl: string | null;
  thumbnailUrl: string | null;
}

export interface CatalogCasting {
  source: CatalogSourceId;
  title: string;
  url: string;
  manufacturer: string;
  imageUrl: string | null;
  versions: CatalogVersion[];
}

export async function searchCatalog(
  q: string,
  source: CatalogSearchSource
): Promise<CatalogCastingSummary[]> {
  return (
    await apiClient.get<CatalogCastingSummary[]>("/api/catalog/search", { params: { q, source } })
  ).data;
}

export async function getCatalogCasting(
  source: CatalogSourceId,
  title: string
): Promise<CatalogCasting> {
  return (
    await apiClient.get<CatalogCasting>("/api/catalog/casting", { params: { source, title } })
  ).data;
}

export interface CatalogSetSummary {
  source: CatalogSourceId;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  setType: SetType;
}

export interface CatalogSetCar {
  name: string;
  color: string | null;
  photoUrl: string | null;
  thumbnailUrl: string | null;
}

export interface CatalogSet {
  source: CatalogSourceId;
  title: string;
  url: string;
  manufacturer: string;
  imageUrl: string | null;
  setType: SetType;
  toyNumber: string | null;
  year: number | null;
  cars: CatalogSetCar[];
}

// Sets are only matched on the Hot Wheels Wiki (see backend app/services/wiki_catalog.py).
export async function searchCatalogSets(q: string): Promise<CatalogSetSummary[]> {
  return (await apiClient.get<CatalogSetSummary[]>("/api/catalog/sets/search", { params: { q } }))
    .data;
}

export async function getCatalogSet(source: CatalogSourceId, title: string): Promise<CatalogSet> {
  return (await apiClient.get<CatalogSet>("/api/catalog/set", { params: { source, title } })).data;
}

export async function importWikiImage(url: string): Promise<string> {
  return (await apiClient.post<{ url: string }>("/api/uploads/car-images/from-wiki", { url })).data
    .url;
}

export async function importCarPhotoFromWiki(carId: number, url: string): Promise<CarPhoto> {
  return (await apiClient.post<CarPhoto>(`/api/cars/${carId}/photos/from-wiki`, { url })).data;
}
