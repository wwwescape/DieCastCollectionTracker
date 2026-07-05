import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../api/dashboard";

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: getDashboardStats });
}
