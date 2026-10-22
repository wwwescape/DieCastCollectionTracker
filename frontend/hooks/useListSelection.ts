import { useCallback, useMemo, useState } from "react";

// Selection mode for the Vehicles and Sets lists (VideoGameTrackarr's Games page pattern).
// Only items still visible count as selected, so narrowing the filters while selecting can't
// leave hidden items in a bulk action.
export function useListSelection<T extends { id: number }>(visible: T[]) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set());

  const selectedIds = useMemo(
    () => visible.filter((item) => picked.has(item.id)).map((item) => item.id),
    [visible, picked]
  );
  const allVisibleSelected = visible.length > 0 && selectedIds.length === visible.length;

  const enter = useCallback(() => {
    setSelectionMode(true);
    setPicked(new Set());
  }, []);

  const exit = useCallback(() => {
    setSelectionMode(false);
    setPicked(new Set());
  }, []);

  const toggle = useCallback((id: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setPicked(allVisibleSelected ? new Set() : new Set(visible.map((item) => item.id)));
  }, [allVisibleSelected, visible]);

  return {
    selectionMode,
    selectedIds,
    isSelected: (id: number) => picked.has(id),
    allVisibleSelected,
    enter,
    exit,
    toggle,
    toggleAll,
  };
}
