import { useQuery } from "@tanstack/react-query";
import { listPublicCars, listPublicSets } from "../api/public";

export function usePublicCars(token: string | undefined, search: string) {
  return useQuery({
    queryKey: ["public", token, "cars", search],
    queryFn: () => listPublicCars(token!, search || undefined),
    enabled: Boolean(token),
    retry: false,
  });
}

export function usePublicSets(token: string | undefined, search: string) {
  return useQuery({
    queryKey: ["public", token, "sets", search],
    queryFn: () => listPublicSets(token!, search || undefined),
    enabled: Boolean(token),
    retry: false,
  });
}
