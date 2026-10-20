import { useMemo } from "react";
import { buildCollectionIndex } from "../utils/collectionIndex";
import { useCarList } from "./useCars";
import { useSetList } from "./useSets";

// The whole collection, indexed for the wiki search screens' "already in DCT" chips.
export function useCollectionIndex() {
  const { data: cars } = useCarList();
  const { data: sets } = useSetList();
  return useMemo(() => buildCollectionIndex(cars ?? [], sets ?? []), [cars, sets]);
}
