import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getVersion } from "../api/version";

// Ported from VideoGameTrackarr. Changes at most once per release, so a long staleTime just
// avoids refetching on every remount/focus.
//
// checkForUpdates() is for the About page's "Check for updates" button: plain refetch() would
// only bypass this hook's own staleTime, not the backend's 6-hour GitHub cache
// (version_service.py), so a manual check could replay a stale answer. forceRef makes the next
// queryFn call ask for force=true without changing the queryKey on every render.
export function useVersion() {
  const forceRef = useRef(false);
  const query = useQuery({
    queryKey: ["version"],
    queryFn: () => {
      const force = forceRef.current;
      forceRef.current = false;
      return getVersion(force);
    },
    staleTime: 60 * 60 * 1000,
  });

  const checkForUpdates = () => {
    forceRef.current = true;
    return query.refetch();
  };

  return { ...query, checkForUpdates };
}
