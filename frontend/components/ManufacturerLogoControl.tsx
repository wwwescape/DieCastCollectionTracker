import { useRef, type ChangeEvent } from "react";
import { toast } from "react-toastify";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "../api/client";
import type { Manufacturer } from "../api/lookups";
import { useManufacturerLogo } from "../hooks/useLookups";
import { manufacturerLogo } from "../utils/manufacturerLogos";
import { TOAST_OPTIONS } from "../utils/toastOptions";

const previewSx = {
  width: 64,
  height: 32,
  p: 0.5,
  bgcolor: "#ffffff",
  borderRadius: 0.75,
  border: 1,
  borderColor: "divider",
  objectFit: "contain",
  flexShrink: 0,
} as const;

// A manufacturer's logo in Settings → Lookups. One the app bundles (utils/manufacturerLogos)
// just shows; any other can have one uploaded, replaced or removed.
const ManufacturerLogoControl = ({ manufacturer }: { manufacturer: Manufacturer }) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, remove } = useManufacturerLogo();
  const { id, name, logoUrl } = manufacturer;
  const bundled = manufacturerLogo(name);

  if (bundled && !logoUrl) {
    return (
      <Tooltip title={t("lookups.logo.bundled", { name })}>
        <Box component="img" src={bundled} alt="" sx={previewSx} />
      </Tooltip>
    );
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await upload.mutateAsync({ id, file });
      toast.success(t("lookups.logo.uploaded"), TOAST_OPTIONS);
    } catch {
      toast.error(t("lookups.logo.error"), TOAST_OPTIONS);
    }
  };

  const handleRemove = async () => {
    try {
      await remove.mutateAsync(id);
      toast.success(t("lookups.logo.removed"), TOAST_OPTIONS);
    } catch {
      toast.error(t("lookups.logo.removeError"), TOAST_OPTIONS);
    }
  };

  const label = logoUrl ? t("lookups.logo.replace", { name }) : t("lookups.logo.upload", { name });
  return (
    <>
      {logoUrl ? (
        <Box component="img" src={resolveAssetUrl(logoUrl) ?? undefined} alt="" sx={previewSx} />
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => void handleFile(event)}
      />
      <Tooltip title={label}>
        <span>
          <IconButton
            size="small"
            aria-label={label}
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <CircularProgress size={18} />
            ) : (
              <AddPhotoAlternateIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      {logoUrl ? (
        <Tooltip title={t("lookups.logo.remove", { name })}>
          <span>
            <IconButton
              size="small"
              aria-label={t("lookups.logo.remove", { name })}
              disabled={remove.isPending}
              onClick={() => void handleRemove()}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
    </>
  );
};

export default ManufacturerLogoControl;
