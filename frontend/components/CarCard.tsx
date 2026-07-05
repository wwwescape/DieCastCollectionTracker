import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import { resolveAssetUrl } from "../api/client";
import type { Car } from "../api/types";
import { CONDITION_LABELS } from "../api/types";

interface CarCardProps {
  car: Car;
  onClick: () => void;
  onDelete: () => void;
}

const CarCard = ({ car, onClick, onDelete }: CarCardProps) => {
  const theme = useTheme();
  const subtitle = [car.manufacturerName, car.seriesName].filter(Boolean).join(" · ");

  return (
    <Card
      sx={{
        position: "relative",
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 150ms ease, box-shadow 150ms ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: theme.shadows[6] },
      }}
      onClick={onClick}
    >
      <Chip
        label={car.status === "owned" ? "Owned" : "Wishlist"}
        size="small"
        color={car.status === "owned" ? "primary" : "default"}
        sx={{ position: "absolute", top: 8, left: 8, zIndex: 1 }}
      />
      <Tooltip title="Delete">
        <IconButton
          size="small"
          aria-label={`Delete ${car.name}`}
          sx={{ position: "absolute", top: 4, right: 4, zIndex: 1, bgcolor: "background.paper" }}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Box
        sx={{
          position: "relative",
          aspectRatio: "4 / 3",
          overflow: "hidden",
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {car.photo ? (
          <CardMedia
            component="img"
            alt={car.name}
            image={resolveAssetUrl(car.photo) ?? undefined}
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "action.hover",
              color: "text.secondary",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="caption">No photo</Typography>
          </Box>
        )}
      </Box>

      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Tooltip title={car.name}>
          <Typography
            variant="subtitle2"
            component="div"
            sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            <strong>{car.name}</strong>
          </Typography>
        </Tooltip>
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {subtitle || " "}
        </Typography>
        <Box sx={{ mt: 0.75, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {car.condition ? (
            <Chip label={CONDITION_LABELS[car.condition]} size="small" variant="outlined" color="info" />
          ) : null}
          {car.quantity > 1 ? <Chip label={`x${car.quantity}`} size="small" /> : null}
        </Box>
      </CardContent>
    </Card>
  );
};

export default CarCard;
