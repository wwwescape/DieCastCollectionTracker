import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";
import type { LookupKind } from "../api/lookups";
import { useMergeLookup, useRenameLookup } from "../hooks/useLookups";
import { TOAST_OPTIONS } from "../utils/toastOptions";
import AutocompleteSelect from "./AutocompleteSelect";
import type { LookupItem } from "./LookupSection";

// The server explains a refusal (wiki-backed, name taken) in `detail`; show it as is.
function errorMessage(error: unknown, fallback: string): string {
  if (
    isAxiosError<{ detail?: string }>(error) &&
    typeof error.response?.data?.detail === "string"
  ) {
    return error.response.data.detail;
  }
  return fallback;
}

interface RenameLookupDialogProps {
  kind: LookupKind;
  item: LookupItem | null;
  onClose: () => void;
}

export const RenameLookupDialog = ({ kind, item, onClose }: RenameLookupDialogProps) => {
  const { t } = useTranslation();
  const rename = useRenameLookup();
  const [name, setName] = useState(item?.label ?? "");
  const [useColor, setUseColor] = useState(Boolean(item?.color));
  const [color, setColor] = useState(item?.color ?? "#1f67d8");
  const [error, setError] = useState<string | null>(null);
  const isTag = kind === "tags";

  if (!item) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await rename.mutateAsync({
        kind,
        id: item.id,
        name: trimmed,
        ...(isTag ? { color: useColor ? color : null } : {}),
      });
      toast.success(t("lookups.renamed"), TOAST_OPTIONS);
      onClose();
    } catch (renameError) {
      setError(errorMessage(renameError, t("lookups.renameError")));
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={(event) => void handleSubmit(event)}>
        <DialogTitle>{t("lookups.renameTitle", { name: item.label })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label={t("common.name")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              required
            />
            {isTag ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useColor}
                      onChange={(event) => setUseColor(event.target.checked)}
                    />
                  }
                  label={t("lookups.customColor")}
                />
                {useColor ? (
                  <Box
                    component="input"
                    type="color"
                    value={color}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setColor(event.target.value)
                    }
                    aria-label={t("lookups.tagColor")}
                    sx={{
                      width: 40,
                      height: 36,
                      p: 0.5,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  />
                ) : null}
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="contained" disabled={!name.trim() || rename.isPending}>
            {t("lookups.rename")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface MergeLookupDialogProps {
  kind: LookupKind;
  item: LookupItem | null;
  // The entries it can merge into (series: the same manufacturer's only).
  candidates: LookupItem[];
  usageText: string;
  onClose: () => void;
}

export const MergeLookupDialog = ({
  kind,
  item,
  candidates,
  usageText,
  onClose,
}: MergeLookupDialogProps) => {
  const { t } = useTranslation();
  const merge = useMergeLookup();
  const [target, setTarget] = useState<LookupItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const handleMerge = async () => {
    if (!target) return;
    setError(null);
    try {
      await merge.mutateAsync({ kind, id: item.id, intoId: target.id });
      toast.success(t("lookups.merged", { from: item.label, into: target.label }), TOAST_OPTIONS);
      onClose();
    } catch (mergeError) {
      setError(errorMessage(mergeError, t("lookups.mergeError")));
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("lookups.mergeTitle", { name: item.label })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <DialogContentText>{t("lookups.mergeHelp", { name: item.label })}</DialogContentText>
          <AutocompleteSelect<LookupItem>
            label={t("lookups.mergeInto")}
            options={candidates}
            value={target}
            onChange={setTarget}
            getOptionLabel={(option) =>
              option.secondary ? `${option.label} · ${option.secondary}` : option.label
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            fullWidth
          />
          {target ? (
            <Alert severity="info">
              {t("lookups.mergeSummary", {
                usage: usageText,
                from: item.label,
                into: target.label,
              })}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          onClick={() => void handleMerge()}
          disabled={!target || merge.isPending}
        >
          {t("lookups.merge")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
