import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import { useTranslation } from "react-i18next";
import OwnershipBadges from "./OwnershipBadges";
import PhotoImg from "./PhotoImg";
import type { CarStatus } from "../api/types";

export interface ItemCardHolding {
  status: CarStatus;
  quantity: number;
}

interface ItemCardProps {
  title: string;
  subtitle?: string | null;
  // A third line, for search results that need one (toy number, collector number).
  detail?: string | null;
  imageUrl?: string | null;
  // Photos are shown whole by default; "cover" crops them to fill the well.
  imageFit?: "cover" | "contain";
  // This exact item is in DCT: VideoGameTrackarr's status badge (a heart top-left when
  // wishlisted, a check top-right when owned) and the quantity bottom-left when it's more
  // than one.
  holding?: ItemCardHolding | null;
  // Bottom-left, after the quantity: something related (same casting, series...) is in DCT.
  relatedHint?: string | null;
  // Bottom-right: added by hand rather than from the wiki, like VideoGameTrackarr's Custom tag.
  custom?: boolean;
  chips?: ReactNode;
  // A button pinned to the bottom, for search results.
  action?: ReactNode;
  highlighted?: boolean;
  onClick?: () => void;
  // Selection mode on the Vehicles and Sets lists: a check box top-left, and clicking the card
  // toggles it instead of opening the item.
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

const LINE_SX = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;

// Small dark pill over the photo (quantity, Custom, Wishlist).
const Pill = ({ children, sx }: { children: ReactNode; sx?: object }) => (
  <Box
    component="span"
    sx={{
      position: "absolute",
      px: 0.875,
      py: "2px",
      borderRadius: 2.5,
      bgcolor: "rgba(10,12,16,.72)",
      color: "#fff",
      fontSize: 11,
      fontWeight: 650,
      lineHeight: 1.4,
      letterSpacing: "0.02em",
      maxWidth: "calc(100% - 16px)",
      ...LINE_SX,
      ...sx,
    }}
  >
    {children}
  </Box>
);

// The one card layout for cars, sets and wiki search results: a light photo well with the
// shot shown whole, then a title and a muted meta line underneath — no box around it, so a
// grid of them reads as a wall of photos. Every text line ellipsizes, so a long name can't
// make one card taller than its neighbours.
const ItemCard = ({
  title,
  subtitle,
  detail,
  imageUrl,
  imageFit = "contain",
  holding,
  relatedHint,
  custom = false,
  chips,
  action,
  highlighted = false,
  onClick,
  selectable = false,
  selected = false,
  onToggleSelect,
}: ItemCardProps) => {
  const { t } = useTranslation();
  const handleClick = selectable ? onToggleSelect : onClick;
  const ring = selected || highlighted;

  const media = (
    <Box
      className="item-photo"
      sx={{
        position: "relative",
        aspectRatio: "4 / 3",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "dct.photoBg",
        outline: ring ? 2 : 1,
        outlineStyle: "solid",
        outlineColor: ring ? "primary.main" : "dct.border",
        outlineOffset: ring ? "-2px" : "-1px",
        transition: "outline-color .15s",
      }}
    >
      <Box sx={{ position: "absolute", inset: 0 }}>
        <PhotoImg
          src={imageUrl}
          alt={title}
          sx={{ objectFit: imageFit, p: imageFit === "contain" ? 0.5 : 0 }}
        />
      </Box>
      {selectable ? (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 1,
            width: 22,
            height: 22,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            color: "#fff",
            bgcolor: selected ? "primary.main" : "rgba(10,12,16,.6)",
            border: "1.5px solid",
            borderColor: selected ? "primary.main" : "rgba(255,255,255,.7)",
            "& svg": { fontSize: 16 },
          }}
        >
          {selected ? <CheckIcon /> : null}
        </Box>
      ) : null}
      {/* In selection mode the check box takes the wishlist heart's corner. */}
      {holding && !(selectable && holding.status === "wishlist") ? (
        <OwnershipBadges status={holding.status} />
      ) : null}
      {(holding && holding.quantity > 1) || relatedHint ? (
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: 8,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {holding && holding.quantity > 1 ? (
            <Tooltip title={t("common.quantity")}>
              <Box
                component="span"
                aria-label={t("common.quantity")}
                sx={{
                  minWidth: 24,
                  height: 24,
                  px: 0.875,
                  borderRadius: 3,
                  display: "inline-grid",
                  placeItems: "center",
                  bgcolor: "dct.glass",
                  border: 1,
                  borderColor: "dct.glassLine",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {holding.quantity}
              </Box>
            </Tooltip>
          ) : null}
          {relatedHint ? (
            <Tooltip title={relatedHint}>
              <Box
                aria-label={relatedHint}
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  bgcolor: "dct.glass",
                  border: 1,
                  borderColor: "dct.glassLine",
                  color: "#fff",
                  "& svg": { fontSize: 16 },
                }}
              >
                <PlaylistAddCheckIcon />
              </Box>
            </Tooltip>
          ) : null}
        </Box>
      ) : null}
      {custom ? (
        <Pill sx={{ bottom: 8, right: 8, fontSize: 10, textTransform: "uppercase" }}>
          {t("common.custom")}
        </Pill>
      ) : null}
    </Box>
  );

  const body = (
    <Box sx={{ pt: 0.875, textAlign: "left" }}>
      <Typography
        variant="subtitle2"
        component="div"
        title={title}
        sx={{ ...LINE_SX, fontSize: 13.5 }}
      >
        {title}
      </Typography>
      {subtitle !== undefined ? (
        <Typography variant="caption" component="div" sx={{ ...LINE_SX, color: "dct.text3" }}>
          {subtitle || " "}
        </Typography>
      ) : null}
      {detail !== undefined ? (
        <Typography variant="caption" component="div" sx={{ ...LINE_SX, color: "dct.text3" }}>
          {detail || " "}
        </Typography>
      ) : null}
      {chips ? (
        <Box
          sx={{
            mt: 0.75,
            height: 24,
            display: "flex",
            gap: 0.5,
            flexWrap: "nowrap",
            overflow: "hidden",
          }}
        >
          {chips}
        </Box>
      ) : null}
    </Box>
  );

  return (
    <Box
      className="item-card"
      sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
    >
      {handleClick ? (
        <ButtonBase
          onClick={handleClick}
          aria-pressed={selectable ? selected : undefined}
          focusRipple
          sx={{
            display: "block",
            flexGrow: 1,
            borderRadius: 2,
            "&:hover .item-photo": { outlineColor: ring ? "primary.main" : "dct.borderStrong" },
          }}
        >
          {media}
          {body}
        </ButtonBase>
      ) : (
        <Box sx={{ flexGrow: 1 }}>
          {media}
          {body}
        </Box>
      )}
      {action ? <Box sx={{ pt: 1 }}>{action}</Box> : null}
    </Box>
  );
};

export default ItemCard;
