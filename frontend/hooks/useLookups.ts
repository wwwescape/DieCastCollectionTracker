import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColor,
  createManufacturer,
  createSeries,
  createVehicleType,
  deleteColor,
  deleteManufacturer,
  deleteSeries,
  deleteVehicleType,
  listColors,
  listManufacturerOverview,
  listManufacturers,
  listSeries,
  listSeriesOverview,
  getLookupsUsage,
  mergeLookup,
  removeManufacturerLogo,
  renameLookup,
  uploadManufacturerLogo,
  type LookupKind,
  listVehicleTypes,
} from "../api/lookups";

export function useManufacturers() {
  return useQuery({ queryKey: ["manufacturers"], queryFn: listManufacturers });
}

// Keyed under "dashboard" so every car and set change (which refreshes the dashboard) keeps
// the counts current too.
export function useManufacturerOverview({ enabled = true } = {}) {
  return useQuery({
    queryKey: ["dashboard", "manufacturers"],
    queryFn: listManufacturerOverview,
    enabled,
  });
}

export function useSeriesOverview({ enabled = true } = {}) {
  return useQuery({ queryKey: ["dashboard", "series"], queryFn: listSeriesOverview, enabled });
}

export function useCreateManufacturer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createManufacturer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manufacturers"] }),
  });
}

export function useDeleteManufacturer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManufacturer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manufacturers"] }),
  });
}

// The Manufacturers page and cards read logos from the overview (under "dashboard"), and the
// Lookups list from "manufacturers", so a logo change refreshes both.
export function useManufacturerLogo() {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "manufacturers"] });
  };
  const upload = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadManufacturerLogo(id, file),
    networkMode: "always",
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: removeManufacturerLogo, onSuccess: refresh });
  return { upload, remove };
}

export function useVehicleTypes() {
  return useQuery({ queryKey: ["vehicle-types"], queryFn: listVehicleTypes });
}

export function useCreateVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createVehicleType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicle-types"] }),
  });
}

export function useDeleteVehicleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVehicleType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicle-types"] }),
  });
}

export function useColors() {
  return useQuery({ queryKey: ["colors"], queryFn: listColors });
}

export function useCreateColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createColor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["colors"] }),
  });
}

export function useDeleteColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteColor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["colors"] }),
  });
}

export function useSeries(manufacturerId?: number) {
  return useQuery({
    queryKey: ["series", manufacturerId ?? null],
    queryFn: () => listSeries(manufacturerId),
  });
}

export function useCreateSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, manufacturer }: { name: string; manufacturer: string | null }) =>
      createSeries(name, manufacturer),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["series"] }),
  });
}

export function useDeleteSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSeries,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["series"] }),
  });
}

// --- Settings → Lookups: usage, rename, merge ---

export const LOOKUPS_USAGE_KEY = ["lookups", "usage"] as const;

export function useLookupsUsage() {
  return useQuery({ queryKey: LOOKUPS_USAGE_KEY, queryFn: getLookupsUsage });
}

// A rename or merge changes names shown all over the app (cards, filters, series pages), so
// everything is refetched rather than guessing which queries mention the entry.
export function useRenameLookup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      id,
      name,
      color,
    }: {
      kind: LookupKind;
      id: number;
      name: string;
      color?: string | null;
    }) => renameLookup(kind, id, color === undefined ? { name } : { name, color }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useMergeLookup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id, intoId }: { kind: LookupKind; id: number; intoId: number }) =>
      mergeLookup(kind, id, intoId),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
