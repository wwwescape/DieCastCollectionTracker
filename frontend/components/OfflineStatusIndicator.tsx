import { useEffect, useRef } from "react";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import SyncIcon from "@mui/icons-material/Sync";
import Chip from "@mui/material/Chip";
import { useMutationState } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { TOAST_OPTIONS } from "../utils/toastOptions";

// Mutations made while offline just sit pending (networkMode: 'online' pauses them and
// mutateAsync's promise simply never settles until reconnect) — components that await
// mutateAsync() and toast on success/failure would otherwise show no feedback at all until
// connectivity returns. One app-wide transition toast here covers every mutation site.
const OfflineStatusIndicator = () => {
  const isOnline = useOnlineStatus();
  const pausedMutationCount = useMutationState({
    filters: { predicate: (mutation) => mutation.state.isPaused },
  }).length;

  const wasOnline = useRef(isOnline);
  const hadPendingSync = useRef(false);

  useEffect(() => {
    if (wasOnline.current && !isOnline) {
      toast.warning(
        "You're offline. Changes will be saved and synced automatically once you're back online.",
        TOAST_OPTIONS
      );
    }
    wasOnline.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    if (pausedMutationCount > 0) {
      hadPendingSync.current = true;
    } else if (hadPendingSync.current) {
      hadPendingSync.current = false;
      toast.success("Back online — your pending changes have synced.", TOAST_OPTIONS);
    }
  }, [pausedMutationCount]);

  if (!isOnline) {
    return (
      <Chip
        icon={<CloudOffIcon />}
        label={
          pausedMutationCount > 0
            ? `Offline · ${pausedMutationCount} change${pausedMutationCount > 1 ? "s" : ""} pending`
            : "Offline"
        }
        color="warning"
        size="small"
        sx={{ mr: 1 }}
      />
    );
  }

  if (pausedMutationCount > 0) {
    return (
      <Chip
        icon={<SyncIcon />}
        label={`Syncing ${pausedMutationCount} change${pausedMutationCount > 1 ? "s" : ""}...`}
        color="info"
        size="small"
        sx={{ mr: 1 }}
      />
    );
  }

  return null;
};

export default OfflineStatusIndicator;
