import { useMutation } from "@tanstack/react-query";
import { uploadCarImage } from "../api/uploads";

export function useUploadCarImage() {
  return useMutation({ mutationFn: uploadCarImage });
}
