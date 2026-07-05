export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface CurrentUser {
  id: number;
  username: string;
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

export const CONDITION_LABELS: Record<CarCondition, string> = {
  mint_in_box: "Mint in Box",
  near_mint: "Near Mint",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export interface CarPhoto {
  id: number;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
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
  photo: string | null;
  photos: CarPhoto[];
  tags: Tag[];
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
  photo?: string | null;
  tags: string[];
}
