import { useCallback } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

// Route state that keeps Back predictable around the vehicle and set pages.
//
// - A detail page opened from inside the app carries `from` (the page it was opened from), so
//   its Back button can step back in history to exactly that page — scroll and all — instead of
//   guessing. Opened from a bookmark or a reload it has no `from`, and Back goes to the list.
// - The edit page carries `fromDetail` when it was opened from the detail page. Saving or
//   leaving then steps back to that same history entry rather than pushing a second copy of the
//   detail page, which is what used to make Back land on the edit page (and reopen the match
//   dialog) after a Re-match.
export interface NavState {
  from?: string;
  fromDetail?: boolean;
  openMatch?: boolean;
}

export const navState = (location: Location): NavState | null =>
  (location.state as NavState | null) ?? null;

// State to pass when opening a vehicle or set page from the current page.
export const openedFrom = (location: Location): NavState => ({
  from: location.pathname + location.search,
});

// Detail pages: where Back goes, and whether it's the list itself (for the button's label).
export function useDetailBack(listPath: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = navState(location)?.from;
  const back = useCallback(() => {
    if (from) navigate(-1);
    else navigate(listPath);
  }, [from, listPath, navigate]);
  return { back, toList: !from || from === listPath };
}

// Edit pages: return to the item's page after saving or on Back, without growing history.
export function useEditReturn(detailPath: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const fromDetail = Boolean(navState(location)?.fromDetail);
  return useCallback(() => {
    if (fromDetail) navigate(-1);
    else navigate(detailPath, { replace: true });
  }, [detailPath, fromDetail, navigate]);
}

// "Back to search / versions / set" buttons in the add flow: these pages are always opened
// from the one before, so step back to it (keeping its search and scroll) rather than pushing a
// new copy and making the browser's Back bounce between the two. Opened directly (a bookmark,
// a new tab) there's nothing to step back to, so go to `fallback` instead.
export function useStepBack() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (fallback: string) => {
      if (location.key !== "default") navigate(-1);
      else navigate(fallback);
    },
    [location.key, navigate]
  );
}
