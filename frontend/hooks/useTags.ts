import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTag, deleteTag, getTagCoverage, listTags } from "../api/tags";

export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: listTags });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string | null }) =>
      createTag(name, color),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

// The bulk Tags dialog's "3 of 5" counts for the current selection.
export function useTagCoverage(vehicleIds: number[], setIds: number[], enabled: boolean) {
  return useQuery({
    queryKey: ["tagCoverage", vehicleIds, setIds],
    queryFn: () => getTagCoverage(vehicleIds, setIds),
    enabled: enabled && vehicleIds.length + setIds.length > 0,
  });
}
