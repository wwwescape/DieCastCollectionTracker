import Chip from "@mui/material/Chip";
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
}

const CarCard = ({ car, onClick }: CarCardProps) => {
  const { t } = useTranslation();
  return (
    <ItemCard
      title={car.name}
      subtitle={[car.manufacturerName, car.seriesName].filter(Boolean).join(" · ")}
      imageUrl={resolveAssetUrl(car.photo)}
      holding={car}
      custom={!car.catalogTitle}
      chips={
        car.condition ? (
          <Chip
            label={t(`conditions.${car.condition}`)}
            size="small"
            variant="outlined"
            color="info"
          />
        ) : null
      }
      onClick={onClick}
    />
  );
};

export default CarCard;
