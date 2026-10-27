import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "../api/client";
import type { Car } from "../api/types";
import ItemCard from "./ItemCard";

// Only what the card shows, so the share-link pages' public cars fit too.
export type CarCardData = Pick<
  Car,
  | "name"
  | "manufacturerName"
  | "seriesName"
  | "year"
  | "status"
  | "photo"
  | "condition"
  | "quantity"
  | "catalogTitle"
>;

interface CarCardProps {
  car: CarCardData;
  // Leave out for a read-only card.
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

// Photo, name and one meta line (series or manufacturer · year · condition), with the
// owned/wishlisted badge on the photo.
const CarCard = ({ car, onClick, selectable, selected, onToggleSelect }: CarCardProps) => {
  const { t } = useTranslation();
  return (
    <ItemCard
      title={car.name}
      subtitle={[
        car.seriesName || car.manufacturerName,
        car.year,
        car.condition ? t(`conditions.${car.condition}`) : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      imageUrl={resolveAssetUrl(car.photo)}
      holding={car}
      custom={!car.catalogTitle}
      onClick={onClick}
      selectable={selectable}
      selected={selected}
      onToggleSelect={onToggleSelect}
    />
  );
};

export default CarCard;
