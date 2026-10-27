import CheckIcon from "@mui/icons-material/Check";
import FavoriteIcon from "@mui/icons-material/Favorite";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";
import type { CarStatus } from "../api/types";

const BADGE_SIZE = 30;

const badgeSx = {
  position: "absolute",
  top: 7,
  zIndex: 1,
  width: BADGE_SIZE,
  height: BADGE_SIZE,
  borderRadius: "50%",
  bgcolor: "dct.glass",
  border: 1,
  borderColor: "dct.glassLine",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

// The floating status badge on a card's photo, as on VideoGameTrackarr's cards: a heart
// top-left when wishlisted, a check top-right when owned. Both sit on the same dark glass in
// light and dark mode and are told apart by the icon and its colour.
const OwnershipBadges = ({ status }: { status: CarStatus }) => {
  const { t } = useTranslation();
  return status === "wishlist" ? (
    <Box sx={{ ...badgeSx, left: 7 }}>
      <Tooltip title={t("status.wishlist")}>
        <FavoriteIcon sx={{ fontSize: 17, color: "dct.wishlist" }} />
      </Tooltip>
    </Box>
  ) : (
    <Box sx={{ ...badgeSx, right: 7 }}>
      <Tooltip title={t("status.owned")}>
        <CheckIcon sx={{ fontSize: 19, color: "#6ee7a8" }} />
      </Tooltip>
    </Box>
  );
};

export default OwnershipBadges;
