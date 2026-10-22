// Shared by the Vehicles and Sets lists (see backend app/api/routes/list_params.py): every
// filter takes several values plus an Exclude flag; tags also take Match all.
export type ItemSource = "wiki" | "custom";

export interface BulkEditInput {
  ids: number[];
  // Only the fields present are changed; null clears condition/series.
  status?: "owned" | "wishlist";
  condition?: string | null;
  series?: string | null;
  addTags?: string[];
  removeTagIds?: number[];
}

export interface BulkResult {
  count: number;
}

// Repeated keys (?tagId=1&tagId=2) rather than axios' default tagId[]=1, which FastAPI
// doesn't read as a list.
export const LIST_PARAMS_SERIALIZER = { indexes: null } as const;
