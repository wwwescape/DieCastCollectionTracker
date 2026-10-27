import { useRef, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import RestoreIcon from "@mui/icons-material/Restore";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useExportBackup, useRestoreBackup, type BackupFormat } from "../hooks/useImportExport";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import ConfirmDialog from "./ConfirmDialog";
import { SettingRow } from "./SettingsLayout";

// Settings → Data: one Export (a full .zip with photos, or the data alone as .json) and one
// Restore that takes either, after confirming it replaces the collection.
export default function DataManagementSection() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<BackupFormat>("zip");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const exportBackup = useExportBackup();
  const restoreBackup = useRestoreBackup();

  const handleExport = () =>
    exportBackup.mutate(format, {
      onError: () => toast.error(t("settings.data.exportError"), TOAST_OPTIONS),
    });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setPendingFile(file);
  };

  const handleRestore = () => {
    if (!pendingFile) return;
    restoreBackup.mutate(pendingFile, {
      onError: () => toast.error(t("settings.data.restoreError"), TOAST_OPTIONS),
    });
    setPendingFile(null);
  };

  return (
    <>
      <SettingRow name={t("settings.data.export")} description={t("settings.data.exportHelp")}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={format}
            onChange={(_event, value: BackupFormat | null) => value && setFormat(value)}
            aria-label={t("settings.data.format")}
          >
            <ToggleButton value="zip">{t("settings.data.formatZip")}</ToggleButton>
            <ToggleButton value="json">{t("settings.data.formatJson")}</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            loading={exportBackup.isPending}
          >
            {t("settings.data.exportButton")}
          </Button>
        </Stack>
      </SettingRow>
      <SettingRow
        name={t("settings.data.restore")}
        description={t("settings.data.restoreDescription")}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          style={{ display: "none" }}
          onChange={handleFileChange}
          data-testid="restore-file"
        />
        <Button
          variant="outlined"
          color="warning"
          startIcon={<RestoreIcon />}
          onClick={() => fileInputRef.current?.click()}
          loading={restoreBackup.isPending}
        >
          {t("settings.data.restoreButton")}
        </Button>
      </SettingRow>
      <ConfirmDialog
        open={pendingFile !== null}
        title={t("settings.data.restoreConfirmTitle")}
        description={t("settings.data.restoreConfirmDescription", {
          file: pendingFile?.name ?? "",
        })}
        confirmLabel={t("settings.data.restoreConfirm")}
        confirmColor="error"
        onClose={() => setPendingFile(null)}
        onConfirm={handleRestore}
      />
    </>
  );
}
