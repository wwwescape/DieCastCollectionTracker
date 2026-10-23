import { useState } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useRegenerateShareLink, useShareLink } from "../hooks/useShareLink";
import { copyText } from "../utils/clipboard";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import ConfirmDialog from "./ConfirmDialog";

// Settings → Share, ported from VideoGameTrackarr: read-only links to Cars and Sets for
// anyone without an account. Regenerating is the only way to revoke them.
const ShareSection = () => {
  const { t } = useTranslation();
  const { data: token } = useShareLink();
  const regenerate = useRegenerateShareLink();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const links = [
    {
      label: t("settings.share.vehiclesLink"),
      url: token ? `${window.location.origin}/public/${token}/vehicles` : "",
    },
    {
      label: t("settings.share.setsLink"),
      url: token ? `${window.location.origin}/public/${token}/sets` : "",
    },
  ];

  const handleCopy = async (url: string) => {
    try {
      await copyText(url);
      toast.success(t("settings.share.copied"), TOAST_OPTIONS);
    } catch (error) {
      console.error("Error copying share link:", error);
      toast.error(t("settings.share.copyError"), TOAST_OPTIONS);
    }
  };

  const handleRegenerate = async () => {
    try {
      await regenerate.mutateAsync();
      toast.success(t("settings.share.regenerated"), TOAST_OPTIONS);
    } catch (error) {
      console.error("Error regenerating share link:", error);
      toast.error(t("settings.share.regenerateError"), TOAST_OPTIONS);
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <Stack spacing={2}>
      {links.map((link) => (
        <Box key={link.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            label={link.label}
            value={link.url}
            slotProps={{ input: { readOnly: true } }}
            fullWidth
          />
          <Tooltip title={t("settings.share.copy")}>
            <span>
              <IconButton
                aria-label={t("settings.share.copyNamed", { name: link.label })}
                onClick={() => void handleCopy(link.url)}
                disabled={!token}
              >
                <ContentCopyIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ))}
      <Box>
        <Button
          variant="outlined"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={() => setConfirmOpen(true)}
          disabled={!token}
        >
          {t("settings.share.regenerate")}
        </Button>
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title={t("settings.share.regenerateConfirmTitle")}
        description={t("settings.share.regenerateConfirmDescription")}
        confirmLabel={t("settings.share.regenerate")}
        confirmColor="error"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleRegenerate()}
      />
    </Stack>
  );
};

export default ShareSection;
