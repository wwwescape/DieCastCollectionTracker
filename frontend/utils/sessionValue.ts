// Small sessionStorage wrapper for "remember what I was doing on this page" state (search
// text, chosen tab) so going back from a result lands where the user left off. Storage can
// throw (private mode, blocked site data), so every access falls back silently.
export function readSessionValue<T extends string>(key: string, fallback: T): T {
  try {
    return (sessionStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeSessionValue(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Not worth surfacing — the page still works, it just won't remember.
  }
}
