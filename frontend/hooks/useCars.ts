import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  addCarPhoto,
  createCar,
  createCarsBulk,
  deleteCar,
  deleteCarPhoto,
  getCar,
  listCars,
  setCarPhotoPrimary,
  updateCar,
  type CarListParams,
} from "../api/cars";
import { importCarPhotoFromWiki } from "../api/catalog";
import type { CarInput } from "../api/types";

// Every car mutation can change the dashboard (counts, breakdowns, recently added), and
// create/update also get-or-create manufacturers, series, vehicle types, colors and tags by
// name — so those lists are refreshed too, or new values stay missing from the filters and
// pickers until the cache goes stale.
const LOOKUP_QUERY_KEYS = [["manufacturers"], ["series"], ["vehicle-types"], ["colors"], ["tags"]];

function invalidateCarQueries(queryClient: QueryClient, { lookups = false } = {}) {
  queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  // A vehicle's linked sets show on those sets too.
  queryClient.invalidateQueries({ queryKey: ["sets"] });
  if (lookups) {
    LOOKUP_QUERY_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  }
}

export function useCarList(params: CarListParams = {}) {
  return useQuery({ queryKey: ["vehicles", params], queryFn: () => listCars(params) });
}

export function useCar(id: number | undefined) {
  return useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => getCar(id!),
    enabled: id !== undefined,
  });
}

export function useCreateCarsBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCarsBulk,
    // Copying wiki photos makes this a long request; never queue it for later while offline.
    networkMode: "always",
    onSuccess: () => invalidateCarQueries(queryClient, { lookups: true }),
  });
}

export function useCreateCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCar,
    onSuccess: () => invalidateCarQueries(queryClient, { lookups: true }),
  });
}

export function useUpdateCar(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CarInput>) => updateCar(id, input),
    onSuccess: () => invalidateCarQueries(queryClient, { lookups: true }),
  });
}

export function useDeleteCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCar,
    onSuccess: () => invalidateCarQueries(queryClient),
  });
}

// --- Photo gallery ---

export function useAddCarPhoto(carId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => addCarPhoto(carId, file),
    onSuccess: () => invalidateCarQueries(queryClient),
  });
}

export function useDeleteCarPhoto(carId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => deleteCarPhoto(carId, photoId),
    onSuccess: () => invalidateCarQueries(queryClient),
  });
}

export function useSetCarPhotoPrimary(carId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => setCarPhotoPrimary(carId, photoId),
    onSuccess: () => invalidateCarQueries(queryClient),
  });
}

export function useImportCarPhotoFromWiki(carId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => importCarPhotoFromWiki(carId, url),
    onSuccess: () => invalidateCarQueries(queryClient),
  });
}
