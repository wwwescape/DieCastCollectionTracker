import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "../api/client";
import type { CarSet } from "../api/types";
import ItemCard from "./ItemCard";

// Only what the card shows, so the share-link pages' public sets fit too.
export type SetCardData = Pick<
  CarSet,
  | "name"
  | "manufacturerName"
  | "year"
  | "status"
  | "photo"
  | "setType"
  | "contents"
  | "sealed"
  | "quantity"
  | "catalogTitle"
>;

interface SetCardProps {
  set: SetCardData;
  // Leave out for a read-only card.
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

// Same layout as CarCard: photo, name and one meta line (type · vehicles · sealed · year).
const SetCard = ({ set, onClick, selectable, selected, onToggleSelect }: SetCardProps) => {
  const { t } = useTranslation();
  return (
    <ItemCard
      title={set.name}
      subtitle={[
        t(`setTypes.${set.setType}`),
        set.contents.length ? t("common.vehicleCount", { count: set.contents.length }) : null,
        set.status === "owned" ? (set.sealed ? t("sets.sealed") : t("sets.opened")) : null,
        set.year,
      ]
        .filter(Boolean)
        .join(" · ")}
      imageUrl={resolveAssetUrl(set.photo)}
      holding={set}
      custom={!set.catalogTitle}
      onClick={onClick}
      selectable={selectable}
      selected={selected}
      onToggleSelect={onToggleSelect}
    />
  );
};

export default SetCard;
