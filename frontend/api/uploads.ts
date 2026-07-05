import { apiClient } from "./client";

export async function uploadCarImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<{ url: string }>("/api/uploads/car-images", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.url;
}
