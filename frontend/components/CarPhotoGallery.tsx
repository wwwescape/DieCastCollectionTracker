import { type ChangeEvent, useRef } from "react";
import { toast } from "react-toastify";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { resolveAssetUrl } from "../api/client";
import type { CarPhoto } from "../api/types";
import { useAddCarPhoto, useDeleteCarPhoto, useSetCarPhotoPrimary } from "../hooks/useCars";
import { TOAST_OPTIONS } from "../utils/toastOptions";

interface CarPhotoGalleryProps {
  carId: number;
  photos: CarPhoto[];
}

const CarPhotoGallery = ({ carId, photos }: CarPhotoGalleryProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPhoto = useAddCarPhoto(carId);
  const deletePhoto = useDeleteCarPhoto(carId);
  const setPrimary = useSetCarPhotoPrimary(carId);

  const sorted = [...photos].sort((a, b) => (a.isPrimary ? -1 : b.isPrimary ? 1 : a.sortOrder - b.sortOrder));

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await addPhoto.mutateAsync(file);
    } catch {
      toast.error("Error uploading photo. Please try again.", TOAST_OPTIONS);
    }
  };

  const handleDelete = async (photoId: number) => {
    try {
      await deletePhoto.mutateAsync(photoId);
    } catch {
      toast.error("Error deleting photo. Please try again.", TOAST_OPTIONS);
    }
  };

  const handleSetPrimary = async (photoId: number) => {
    try {
      await setPrimary.mutateAsync(photoId);
    } catch {
      toast.error("Error updating primary photo. Please try again.", TOAST_OPTIONS);
    }
  };

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Photos
        </Typography>
        <Tooltip title="Add photo">
          <span>
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={addPhoto.isPending}
              aria-label="Add photo"
            >
              {addPhoto.isPending ? <CircularProgress size={18} /> : <AddPhotoAlternateIcon />}
            </IconButton>
          </span>
        </Tooltip>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => void handleFileChange(e)} />
      </Box>

      {sorted.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No photos yet. Click the + button to add one.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {sorted.map((photo) => (
            <Box
              key={photo.id}
              sx={{
                position: "relative",
                width: 120,
                height: 90,
                borderRadius: 1,
                overflow: "hidden",
                border: photo.isPrimary ? "2px solid" : "1px solid",
                borderColor: photo.isPrimary ? "primary.main" : "divider",
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={resolveAssetUrl(photo.url) ?? undefined}
                alt={photo.isPrimary ? "Primary photo" : "Car photo"}
                sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(0,0,0,0.35)",
                  opacity: 0,
                  transition: "opacity 150ms ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.5,
                  "&:hover": { opacity: 1 },
                }}
              >
                <Tooltip title={photo.isPrimary ? "Primary photo" : "Set as primary"}>
                  <span>
                    <IconButton
                      size="small"
                      sx={{ color: "white" }}
                      disabled={photo.isPrimary || setPrimary.isPending}
                      onClick={() => void handleSetPrimary(photo.id)}
                      aria-label={photo.isPrimary ? "Primary photo" : "Set as primary"}
                    >
                      {photo.isPrimary ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Delete photo">
                  <span>
                    <IconButton
                      size="small"
                      sx={{ color: "white" }}
                      disabled={deletePhoto.isPending}
                      onClick={() => void handleDelete(photo.id)}
                      aria-label="Delete photo"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              {photo.isPrimary ? (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 4,
                    left: 4,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    borderRadius: 0.5,
                    px: 0.5,
                    py: 0.25,
                    lineHeight: 1,
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Primary
                </Box>
              ) : null}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default CarPhotoGallery;
