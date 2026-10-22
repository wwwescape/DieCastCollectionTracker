import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from "react";
import { readSessionViewValue, writeSessionViewValue } from "../utils/sessionViewState";

/**
 * Drop-in replacement for useState whose value is remembered for the browser session under
 * `key` (ported from VideoGameTrackarr). Changing `key` while the same component stays
 * mounted switches to that key's own remembered value.
 */
export function useSessionState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  // Value and key live together so a key change can never write one key's value under
  // another key.
  const [state, setState] = useState(() => ({ key, value: readSessionViewValue(key, initial) }));

  let current = state;
  if (state.key !== key) {
    current = { key, value: readSessionViewValue(key, initial) };
    setState(current);
  }

  useEffect(() => {
    writeSessionViewValue(state.key, state.value);
  }, [state]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    setState((prev) => ({
      key: prev.key,
      value: typeof action === "function" ? (action as (value: T) => T)(prev.value) : action,
    }));
  }, []);

  return [current.value, setValue];
}

/**
 * Once an option list has loaded, drops remembered ids that no longer exist in it (a tag or
 * series deleted since it was saved) — otherwise an invisible filter could quietly empty the
 * page, with no chip left in the filter dialog to clear it.
 */
export function usePruneStaleIds(
  ids: number[],
  setIds: Dispatch<SetStateAction<number[]>>,
  options: { id: number }[] | undefined,
  ready: boolean
): void {
  useEffect(() => {
    if (!ready || !options || ids.length === 0) return;
    const valid = new Set(options.map((option) => option.id));
    if (ids.some((id) => !valid.has(id))) {
      setIds(ids.filter((id) => valid.has(id)));
    }
  }, [ids, setIds, options, ready]);
}
