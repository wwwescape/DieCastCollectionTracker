import { useState } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation } from "react-i18next";
import type { CatalogCasting, CatalogCastingSummary, CatalogVersion } from "../api/catalog";
import CatalogSearch from "./CatalogSearch";
import CatalogVersionPicker from "./CatalogVersionPicker";

interface CatalogMatchDialogProps {
  open: boolean;
  initialQuery: string;
  busy?: boolean;
  onClose: () => void;
  onMatch: (match: {
    casting: CatalogCasting;
    version: CatalogVersion;
    query: string;
    addPhoto: boolean;
  }) => void;
}

// Links an existing (often hand-entered) car to its wiki casting, the DieCast counterpart
// of VideoGameTrackarr's "Link to IGDB" dialog: search, pick the casting, pick the release.
const CatalogMatchDialog = ({
  open,
  initialQuery,
  busy = false,
  onClose,
  onMatch,
}: CatalogMatchDialogProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [selected, setSelected] = useState<{
    casting: CatalogCastingSummary;
    query: string;
  } | null>(null);
  const [addPhoto, setAddPhoto] = useState(true);

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg" fullScreen={fullScreen}>
      <DialogTitle>{selected ? t("catalog.pickVersion") : t("catalog.matchTitle")}</DialogTitle>
      <DialogContent dividers>
        {selected ? (
          <CatalogVersionPicker
            source={selected.casting.source}
            title={selected.casting.title}
            query={selected.query}
            pickLabel={t("catalog.useThisVersion")}
            busy={busy}
            onPick={(casting, version) => {
              onMatch({ casting, version, query: selected.query, addPhoto });
              setSelected(null);
            }}
          />
        ) : (
          <CatalogSearch
            initialQuery={initialQuery}
            onSelect={(casting, query) => setSelected({ casting, query })}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        {selected ? (
          <Button startIcon={<ArrowBackIcon />} onClick={() => setSelected(null)}>
            {t("common.backToSearch")}
          </Button>
        ) : (
          <span />
        )}
        <div>
          <FormControlLabel
            control={
              <Checkbox
                checked={addPhoto}
                onChange={(event) => setAddPhoto(event.target.checked)}
              />
            }
            label={t("catalog.addWikiPhoto")}
          />
          <Button onClick={handleClose}>{t("common.cancel")}</Button>
        </div>
      </DialogActions>
    </Dialog>
  );
};

export default CatalogMatchDialog;
