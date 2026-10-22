import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  addSetPhoto,
  bulkDeleteSets,
  bulkEditSets,
  createSet,
  deleteSet,
  deleteSetPhoto,
  getSet,
  listSets,
  setSetPhotoPrimary,
  updateSet,
  type SetListParams,
} from "../api/sets";
import type { SetInput } from "../api/types";

// Set changes move the Collection overview's counts, and create/update can add a
// manufacturer by name — so those are refreshed with the sets themselves.
function invalidateSetQueries(queryClient: QueryClient, { lookups = false } = {}) {
  queryClient.invalidateQueries({ queryKey: ["sets"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  // A set's linked vehicles show on those vehicles too.
  queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  if (lookups) {
    ["manufacturers", "series", "tags"].forEach((key) =>
      queryClient.invalidateQueries({ queryKey: [key] })
    );
  }
}

export function useBulkEditSets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkEditSets,
    onSuccess: () => {
      invalidateSetQueries(queryClient, { lookups: true });
      queryClient.invalidateQueries({ queryKey: ["tagCoverage"] });
    },
  });
}

export function useBulkDeleteSets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkDeleteSets,
    onSuccess: () => invalidateSetQueries(queryClient),
  });
}

export function useSetList(params: SetListParams = {}) {
  return useQuery({ queryKey: ["sets", params], queryFn: () => listSets(params) });
}

export function useSet(id: number | undefined) {
  return useQuery({
    queryKey: ["sets", id],
    queryFn: () => getSet(id!),
    enabled: id !== undefined,
  });
}

export function useCreateSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSet,
    onSuccess: () => invalidateSetQueries(queryClient, { lookups: true }),
  });
}

export function useUpdateSet(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SetInput>) => updateSet(id, input),
    onSuccess: () => invalidateSetQueries(queryClient, { lookups: true }),
  });
}

export function useDeleteSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSet,
    onSuccess: () => invalidateSetQueries(queryClient),
  });
}

// --- Photo gallery ---

export function useAddSetPhoto(setId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => addSetPhoto(setId, file),
    onSuccess: () => invalidateSetQueries(queryClient),
  });
}

export function useDeleteSetPhoto(setId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => deleteSetPhoto(setId, photoId),
    onSuccess: () => invalidateSetQueries(queryClient),
  });
}

export function useSetSetPhotoPrimary(setId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => setSetPhotoPrimary(setId, photoId),
    onSuccess: () => invalidateSetQueries(queryClient),
  });
}
