import { useState } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  useDisableShareLink,
  useEnableShareLink,
  useRegenerateShareLink,
  useShareLink,
} from "../hooks/useShareLink";
import { copyText } from "../utils/clipboard";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import ConfirmDialog from "./ConfirmDialog";

// Settings → Share, ported from VideoGameTrackarr: read-only links to Cars and Sets for
// anyone without an account. Off until turned on here; Regenerate revokes the current links,
// Turn off removes them.
const ShareSection = () => {
  const { t } = useTranslation();
  const { data: token, isPending } = useShareLink();
  const enable = useEnableShareLink();
  const disable = useDisableShareLink();
  const regenerate = useRegenerateShareLink();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

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

  const handleEnable = async () => {
    try {
      await enable.mutateAsync();
      toast.success(t("settings.share.enabled"), TOAST_OPTIONS);
    } catch (error) {
      console.error("Error turning sharing on:", error);
      toast.error(t("settings.share.enableError"), TOAST_OPTIONS);
    }
  };

  const handleDisable = async () => {
    try {
      await disable.mutateAsync();
      toast.success(t("settings.share.disabled"), TOAST_OPTIONS);
    } catch (error) {
      console.error("Error turning sharing off:", error);
      toast.error(t("settings.share.disableError"), TOAST_OPTIONS);
    } finally {
      setDisableOpen(false);
    }
  };

  // Opening Settings publishes nothing: there are no links until sharing is turned on.
  if (!token) {
    return (
      <Stack spacing={2}>
        <Typography variant="body2">{t("settings.share.off")}</Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<LinkIcon />}
            onClick={() => void handleEnable()}
            disabled={isPending || enable.isPending}
          >
            {t("settings.share.enable")}
          </Button>
        </Box>
      </Stack>
    );
  }

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
              >
                <ContentCopyIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ))}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={() => setConfirmOpen(true)}
        >
          {t("settings.share.regenerate")}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LinkOffIcon />}
          onClick={() => setDisableOpen(true)}
        >
          {t("settings.share.disable")}
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
      <ConfirmDialog
        open={disableOpen}
        title={t("settings.share.disableConfirmTitle")}
        description={t("settings.share.disableConfirmDescription")}
        confirmLabel={t("settings.share.disable")}
        confirmColor="error"
        onClose={() => setDisableOpen(false)}
        onConfirm={() => void handleDisable()}
      />
    </Stack>
  );
};

export default ShareSection;
