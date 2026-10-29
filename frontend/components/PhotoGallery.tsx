import { type ChangeEvent, useRef } from "react";
import { toast } from "react-toastify";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { resolveThumbnailUrl } from "../api/client";
import type { UseMutationResult } from "@tanstack/react-query";
import type { CarPhoto } from "../api/types";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import { useTranslation } from "react-i18next";
import { Section } from "./Detail";
import PhotoImg from "./PhotoImg";

// Shared by vehicles and sets: the caller passes that item's photo mutations.
interface PhotoGalleryProps {
  photos: CarPhoto[];
  photoAlt: string;
  addPhoto: UseMutationResult<unknown, Error, File>;
  deletePhoto: UseMutationResult<unknown, Error, number>;
  setPrimary: UseMutationResult<unknown, Error, number>;
}

const PhotoGallery = ({
  photos,
  photoAlt,
  addPhoto,
  deletePhoto,
  setPrimary,
}: PhotoGalleryProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...photos].sort((a, b) =>
    a.isPrimary ? -1 : b.isPrimary ? 1 : a.sortOrder - b.sortOrder
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await addPhoto.mutateAsync(file);
    } catch {
      toast.error(t("gallery.uploadError"), TOAST_OPTIONS);
    }
  };

  const handleDelete = async (photoId: number) => {
    try {
      await deletePhoto.mutateAsync(photoId);
    } catch {
      toast.error(t("gallery.deleteError"), TOAST_OPTIONS);
    }
  };

  const handleSetPrimary = async (photoId: number) => {
    try {
      await setPrimary.mutateAsync(photoId);
    } catch {
      toast.error(t("gallery.primaryError"), TOAST_OPTIONS);
    }
  };

  return (
    <Section
      title={t("gallery.title")}
      action={
        <Tooltip title={t("gallery.add")}>
          <span>
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={addPhoto.isPending}
              aria-label={t("gallery.add")}
            >
              {addPhoto.isPending ? <CircularProgress size={18} /> : <AddPhotoAlternateIcon />}
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void handleFileChange(e)}
      />
      {sorted.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("gallery.empty")}
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {sorted.map((photo) => (
            <Box
              key={photo.id}
              sx={{
                position: "relative",
                width: 180,
                height: 135,
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "dct.photoBg",
                border: photo.isPrimary ? "2px solid" : "1px solid",
                borderColor: photo.isPrimary ? "primary.main" : "divider",
                flexShrink: 0,
              }}
            >
              <PhotoImg
                src={resolveThumbnailUrl(photo.url)}
                alt={photo.isPrimary ? t("gallery.primaryPhoto") : photoAlt}
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
                <Tooltip
                  title={photo.isPrimary ? t("gallery.primaryPhoto") : t("gallery.setPrimary")}
                >
                  <span>
                    <IconButton
                      size="small"
                      sx={{ color: "white" }}
                      disabled={photo.isPrimary || setPrimary.isPending}
                      onClick={() => void handleSetPrimary(photo.id)}
                      aria-label={
                        photo.isPrimary ? t("gallery.primaryPhoto") : t("gallery.setPrimary")
                      }
                    >
                      {photo.isPrimary ? (
                        <StarIcon fontSize="small" />
                      ) : (
                        <StarBorderIcon fontSize="small" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t("gallery.delete")}>
                  <span>
                    <IconButton
                      size="small"
                      sx={{ color: "white" }}
                      disabled={deletePhoto.isPending}
                      onClick={() => void handleDelete(photo.id)}
                      aria-label={t("gallery.delete")}
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
                  {t("gallery.primary")}
                </Box>
              ) : null}
            </Box>
          ))}
        </Box>
      )}
    </Section>
  );
};

export default PhotoGallery;
