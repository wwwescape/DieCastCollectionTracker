import { useRef } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import RestoreIcon from "@mui/icons-material/Restore";
import UploadIcon from "@mui/icons-material/Upload";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "react-toastify";
import { useExportBackup, useExportCsv, useRestoreBackup } from "../hooks/useImportExport";
import { TOAST_OPTIONS } from "../utils/toastOptions";

export default function DataManagementSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportCsv = useExportCsv();
  const exportBackup = useExportBackup();
  const restoreBackup = useRestoreBackup();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    restoreBackup.mutate(file, {
      onError: () => toast.error("Failed to restore backup. Check the file and try again.", TOAST_OPTIONS),
    });
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Export
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => exportCsv.mutate()}
          loading={exportCsv.isPending}
        >
          Export CSV
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => exportBackup.mutate()}
          loading={exportBackup.isPending}
        >
          Export Backup (JSON)
        </Button>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>
        Restore
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Uploading a backup will replace all current data. A safety snapshot is saved automatically before the restore.
      </Typography>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <Button
        variant="contained"
        color="warning"
        startIcon={restoreBackup.isPending ? <UploadIcon /> : <RestoreIcon />}
        onClick={() => fileInputRef.current?.click()}
        loading={restoreBackup.isPending}
      >
        Restore from Backup
      </Button>
    </Box>
  );
}
