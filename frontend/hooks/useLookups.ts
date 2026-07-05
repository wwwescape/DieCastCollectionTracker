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
  listManufacturers,
  listSeries,
  listVehicleTypes,
} from "../api/lookups";

export function useManufacturers() {
  return useQuery({ queryKey: ["manufacturers"], queryFn: listManufacturers });
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
  return useQuery({ queryKey: ["series", manufacturerId ?? null], queryFn: () => listSeries(manufacturerId) });
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
