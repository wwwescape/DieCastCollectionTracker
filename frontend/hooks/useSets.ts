import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createSet, deleteSet, getSet, listSets, updateSet, type SetListParams } from "../api/sets";
import type { SetInput } from "../api/types";

// Set changes move the Collection overview's counts, and create/update can add a
// manufacturer by name — so those are refreshed with the sets themselves.
function invalidateSetQueries(queryClient: QueryClient, { lookups = false } = {}) {
  queryClient.invalidateQueries({ queryKey: ["sets"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  if (lookups) queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
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
