import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCarPhoto,
  createCar,
  deleteCar,
  deleteCarPhoto,
  getCar,
  listCars,
  setCarPhotoPrimary,
  updateCar,
  type CarListParams,
} from "../api/cars";
import type { CarInput } from "../api/types";

export function useCarList(params: CarListParams = {}) {
  return useQuery({ queryKey: ["cars", params], queryFn: () => listCars(params) });
}

export function useCar(id: number | undefined) {
  return useQuery({
    queryKey: ["cars", id],
    queryFn: () => getCar(id!),
    enabled: id !== undefined,
  });
}

export function useCreateCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });
}

export function useUpdateCar(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CarInput>) => updateCar(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });
}

export function useDeleteCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });
}

// --- Photo gallery ---

export function useAddCarPhoto(carId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => addCarPhoto(carId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });
}

export function useDeleteCarPhoto(carId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => deleteCarPhoto(carId, photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });
}

export function useSetCarPhotoPrimary(carId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => setCarPhotoPrimary(carId, photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });
}
