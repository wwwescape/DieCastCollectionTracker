import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getCatalogCasting,
  importWikiImage,
  searchCatalog,
  type CatalogSearchSource,
  type CatalogSourceId,
} from "../api/catalog";

export const MIN_CATALOG_SEARCH_LENGTH = 3;

// Wiki pages change slowly and the backend caches them too, so there's no point refetching
// a search or casting page while the user flips between results.
const CATALOG_STALE_TIME_MS = 30 * 60 * 1000;

export function useCatalogSearch(query: string, source: CatalogSearchSource) {
  return useQuery({
    queryKey: ["catalog", "search", source, query.toLowerCase()],
    queryFn: () => searchCatalog(query, source),
    enabled: query.length >= MIN_CATALOG_SEARCH_LENGTH,
    staleTime: CATALOG_STALE_TIME_MS,
    retry: false,
  });
}

export function useCatalogCasting(source: CatalogSourceId | undefined, title: string | undefined) {
  return useQuery({
    queryKey: ["catalog", "casting", source, title],
    queryFn: () => getCatalogCasting(source!, title!),
    enabled: Boolean(source && title),
    staleTime: CATALOG_STALE_TIME_MS,
    retry: false,
  });
}

export function useImportWikiImage() {
  return useMutation({ mutationFn: importWikiImage, networkMode: "always" });
}
