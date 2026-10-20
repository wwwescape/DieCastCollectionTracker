import Chip from "@mui/material/Chip";
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
>;

interface SetCardProps {
  set: SetCardData;
  // Leave out for a read-only card.
  onClick?: () => void;
}

// Same layout as CarCard, so cars and sets look alike across the Collection.
const SetCard = ({ set, onClick }: SetCardProps) => {
  const { t } = useTranslation();
  return (
    <ItemCard
      title={set.name}
      subtitle={[set.manufacturerName, set.year].filter(Boolean).join(" · ")}
      imageUrl={resolveAssetUrl(set.photo)}
      holding={set}
      chips={
        <>
          <Chip label={t(`setTypes.${set.setType}`)} size="small" variant="outlined" color="info" />
          {set.contents.length ? (
            <Chip label={t("common.vehicleCount", { count: set.contents.length })} size="small" />
          ) : null}
          {set.status === "owned" ? (
            <Chip
              label={set.sealed ? t("sets.sealed") : t("sets.opened")}
              size="small"
              variant="outlined"
            />
          ) : null}
        </>
      }
      onClick={onClick}
    />
  );
};

export default SetCard;
