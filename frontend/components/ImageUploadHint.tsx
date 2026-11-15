import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

// The recommended size for each kind of upload, as on VideoGameTrackarr's upload fields. The
// numbers mirror backend/app/services/upload_service.py (MAX_IMAGE_DIMENSIONS, MAX_UPLOAD_BYTES
// for photos, shown in the 4:3 boxes on cards and the hero; LOGO_MAX_DIMENSIONS, MAX_LOGO_BYTES
// for manufacturer logos); change them together.
export type ImageUploadKind = "photo" | "logo";

const ImageUploadHint = ({
  kind = "photo",
  sx,
}: {
  kind?: ImageUploadKind;
  sx?: SxProps<Theme>;
}) => {
  const { t } = useTranslation();
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", ...sx }}>
      {t(`uploads.hint.${kind}`)}
    </Typography>
  );
};

export default ImageUploadHint;
