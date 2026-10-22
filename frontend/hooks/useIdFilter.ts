import { usePruneStaleIds, useSessionState } from "./useSessionState";

// A lookup filter on the Vehicles or Sets list (manufacturer, series, tags...): the picked ids
// and the Exclude flag, remembered for the session under "<page>.<key>…", and pruned once the
// lookup list shows a remembered id was deleted.
export function useIdFilter(
  page: string,
  key: string,
  options: { id: number }[] | undefined,
  loaded: boolean
) {
  const [ids, setIds] = useSessionState<number[]>(`${page}.${key}Ids`, []);
  const [exclude, setExclude] = useSessionState(`${page}.${key}Exclude`, false);
  usePruneStaleIds(ids, setIds, options, loaded);
  return { ids, setIds, exclude, setExclude };
}

export const byId = (option: { id: number }, value: { id: number }) => option.id === value.id;
export const byValue = <T>(option: T, value: T) => option === value;
export const pickedOptions = <T extends { id: number }>(options: T[] | undefined, ids: number[]) =>
  (options ?? []).filter((option) => ids.includes(option.id));
// Series names repeat per manufacturer; show which one so the options can be told apart.
export const seriesOptionLabel = (option: { name: string; manufacturerName: string | null }) =>
  option.manufacturerName ? `${option.name} · ${option.manufacturerName}` : option.name;
// Omits an empty filter from the request instead of sending an empty list.
export const listOrUndefined = <T>(values: T[]) => (values.length ? values : undefined);
