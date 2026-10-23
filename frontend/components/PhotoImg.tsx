import { useState } from "react";
import Box from "@mui/material/Box";
import NoPhotographyIcon from "@mui/icons-material/NoPhotographyOutlined";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

interface PhotoImgProps {
  src: string | null | undefined;
  alt?: string;
  sx?: SxProps<Theme>;
  iconSize?: number;
}

// A photo that falls back to the no-photo icon when there's none or it fails to load (a file
// missing from uploads, a wiki image that moved), instead of an empty box.
const PhotoImg = ({ src, alt = "", sx, iconSize = 24 }: PhotoImgProps) => {
  const { t } = useTranslation();
  const [failed, setFailed] = useState<string | null>(null);

  if (!src || failed === src) {
    return (
      <Box
        role="img"
        aria-label={t("common.noPhoto")}
        sx={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          color: "#8a93a1",
          "& svg": { fontSize: iconSize },
        }}
      >
        <NoPhotographyIcon />
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(src)}
      sx={[
        {
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          // Product shots on white blend into the light photo well.
          mixBlendMode: "multiply",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
};

export default PhotoImg;
