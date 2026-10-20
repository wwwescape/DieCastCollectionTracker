import { useCallback, useEffect, useRef, useState } from "react";

interface UseUndoableActionOptions<T> {
  getId: (item: T) => number;
  onCommit: (items: T[]) => Promise<void>;
  delayMs?: number;
}

interface ScheduledAction {
  // Returns false when it's too late — the action already ran (or is running).
  undo: () => boolean;
}

interface PendingBatch<T> {
  timeoutId: ReturnType<typeof setTimeout>;
  items: T[];
}

const DEFAULT_DELAY_MS = 5000;

// Stages an action (typically a delete) instead of running it immediately: the affected
// ids are marked "pending" right away so callers can hide/disable them optimistically,
// then `onCommit` actually fires only after `delayMs` unless `undo()` is called first.
// Pairs with a toast that offers an "Undo" button — see CarList. Leaving the page inside the
// window commits right away rather than dropping the action, since the toast already told the
// user it happened.
export function useUndoableAction<T>({
  getId,
  onCommit,
  delayMs = DEFAULT_DELAY_MS,
}: UseUndoableActionOptions<T>) {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set());
  const batchesRef = useRef<Map<number, PendingBatch<T>>>(new Map());
  const nextBatchIdRef = useRef(0);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    const batches = batchesRef.current;
    return () => {
      batches.forEach(({ timeoutId, items }) => {
        clearTimeout(timeoutId);
        void onCommitRef.current(items);
      });
      batches.clear();
    };
  }, []);

  const schedule = useCallback(
    (items: T[]): ScheduledAction => {
      const batchId = nextBatchIdRef.current++;
      const ids = items.map(getId);

      setPendingIds((prev) => new Set([...prev, ...ids]));

      const clearPending = () => {
        setPendingIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      };

      const timeoutId = setTimeout(() => {
        batchesRef.current.delete(batchId);
        void onCommitRef.current(items).finally(clearPending);
      }, delayMs);
      batchesRef.current.set(batchId, { timeoutId, items });

      return {
        undo: () => {
          const batch = batchesRef.current.get(batchId);
          if (!batch) {
            return false;
          }
          clearTimeout(batch.timeoutId);
          batchesRef.current.delete(batchId);
          clearPending();
          return true;
        },
      };
    },
    [getId, delayMs]
  );

  const isPending = useCallback((id: number) => pendingIds.has(id), [pendingIds]);

  return { schedule, isPending, delayMs };
}
