import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { grey } from "@mui/material/colors";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import { useTranslation } from "react-i18next";
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
  // Collection photos fill the frame; wiki photos are shown whole.
  imageFit?: "cover" | "contain";
  // Owned/Wishlisted top-left and the quantity top-right, when this exact item is in DCT.
  holding?: ItemCardHolding | null;
  // Bottom-left: something related (same casting, series...) is already in DCT.
  relatedHint?: string | null;
  // Bottom-right: added by hand rather than from the wiki, like VideoGameTrackarr's Custom chip.
  custom?: boolean;
  chips?: ReactNode;
  // A button pinned to the bottom, for search results.
  action?: ReactNode;
  highlighted?: boolean;
  onClick?: () => void;
  // Selection mode on the Vehicles and Sets lists: a checkbox top-left, and clicking the card
  // toggles it instead of opening the item.
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

const LINE_SX = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;
const CHIP_ROW_HEIGHT = 24;

// The one card layout for cars, sets and wiki search results. Every text line is a single
// line that ellipsizes and the chip row has a fixed height, so a long name or extra chips
// can't make one card taller than its neighbours.
const ItemCard = ({
  title,
  subtitle,
  detail,
  imageUrl,
  imageFit = "cover",
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

  const media = (
    <Box
      sx={{
        position: "relative",
        aspectRatio: "4 / 3",
        bgcolor: "action.hover",
        overflow: "hidden",
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: imageFit,
          }}
        />
      ) : (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}
        >
          {t("common.noPhoto")}
        </Typography>
      )}
      {selectable ? (
        <Checkbox
          checked={selected}
          tabIndex={-1}
          size="small"
          slotProps={{ input: { "aria-label": title } }}
          sx={{
            position: "absolute",
            top: 4,
            left: 4,
            zIndex: 1,
            p: 0.5,
            bgcolor: "background.paper",
            borderRadius: 1,
            "&:hover": { bgcolor: "background.paper" },
          }}
        />
      ) : null}
      {holding ? (
        <>
          <Chip
            label={t(`status.${holding.status}`)}
            size="small"
            color={holding.status === "owned" ? "primary" : "default"}
            // Leaves room for the quantity chip (and the selection checkbox); long
            // translations ellipsize.
            sx={{
              position: "absolute",
              top: 8,
              left: selectable ? 44 : 8,
              maxWidth: selectable ? "calc(100% - 100px)" : "calc(100% - 64px)",
            }}
          />
          <Chip
            label={holding.quantity}
            size="small"
            aria-label={t("common.quantity")}
            sx={{ position: "absolute", top: 8, right: 8, bgcolor: "background.paper" }}
          />
        </>
      ) : null}
      {relatedHint ? (
        <Tooltip title={relatedHint}>
          <Chip
            icon={<PlaylistAddCheckIcon />}
            size="small"
            color="secondary"
            aria-label={relatedHint}
            sx={{
              position: "absolute",
              bottom: 8,
              left: 8,
              "& .MuiChip-label": { display: "none" },
              "& .MuiChip-icon": { mx: 0.5 },
            }}
          />
        </Tooltip>
      ) : null}
      {custom ? (
        <Chip
          label={t("common.custom")}
          size="small"
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            fontWeight: 600,
            color: "common.white",
            bgcolor: grey[600],
            boxShadow: 3,
          }}
        />
      ) : null}
    </Box>
  );

  const body = (
    <Box sx={{ p: 1.5 }}>
      <Tooltip title={title}>
        <Typography variant="subtitle2" component="div" sx={LINE_SX}>
          {title}
        </Typography>
      </Tooltip>
      <Typography variant="caption" color="text.secondary" component="div" sx={LINE_SX}>
        {subtitle || " "}
      </Typography>
      {detail !== undefined ? (
        <Typography variant="caption" color="text.secondary" component="div" sx={LINE_SX}>
          {detail || " "}
        </Typography>
      ) : null}
      <Box
        sx={{
          mt: 0.75,
          height: CHIP_ROW_HEIGHT,
          display: "flex",
          gap: 0.5,
          flexWrap: "nowrap",
          overflow: "hidden",
        }}
      >
        {chips}
      </Box>
    </Box>
  );

  return (
    <Card
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        border: highlighted || selected ? 2 : 1,
        borderColor: highlighted || selected ? "primary.main" : "divider",
      }}
    >
      {handleClick ? (
        <CardActionArea
          onClick={handleClick}
          aria-pressed={selectable ? selected : undefined}
          sx={{ flexGrow: 1, display: "block" }}
        >
          {media}
          {body}
        </CardActionArea>
      ) : (
        <Box sx={{ flexGrow: 1 }}>
          {media}
          {body}
        </Box>
      )}
      {action ? <Box sx={{ p: 1.5, pt: 0 }}>{action}</Box> : null}
    </Card>
  );
};

export default ItemCard;
