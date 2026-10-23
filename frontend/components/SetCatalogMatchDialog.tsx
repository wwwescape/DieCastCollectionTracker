import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useTranslation } from "react-i18next";
import type { CatalogSet, CatalogSetSummary } from "../api/catalog";
import { useCatalogSet } from "../hooks/useCatalog";
import { castingDisplayName } from "../utils/catalog";
import { EmptyState } from "./ListViews";
import PhotoImg from "./PhotoImg";
import SetCatalogSearch from "./SetCatalogSearch";

interface SetCatalogMatchDialogProps {
  open: boolean;
  initialQuery: string;
  busy?: boolean;
  onClose: () => void;
  onMatch: (match: { set: CatalogSet; addPhoto: boolean }) => void;
}

// The sets counterpart of CatalogMatchDialog: search the wiki, pick the set, check it's the
// right one, and its details fill in the edit form for review.
const SetCatalogMatchDialog = ({
  open,
  initialQuery,
  busy = false,
  onClose,
  onMatch,
}: SetCatalogMatchDialogProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [selected, setSelected] = useState<CatalogSetSummary | null>(null);
  const [addPhoto, setAddPhoto] = useState(true);
  const { data: set, isLoading, error } = useCatalogSet(selected?.source, selected?.title);

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg" fullScreen={fullScreen}>
      <DialogTitle>{selected ? t("catalog.confirmSet") : t("catalog.matchTitle")}</DialogTitle>
      <DialogContent dividers>
        {!selected ? (
          <SetCatalogSearch
            initialQuery={initialQuery}
            onSelect={(picked) => setSelected(picked)}
          />
        ) : isLoading ? (
          <EmptyState>{t("common.loading")}</EmptyState>
        ) : error || !set ? (
          <EmptyState>{t("catalog.loadError")}</EmptyState>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "280px 1fr" },
              gap: 2.5,
              alignItems: "start",
            }}
          >
            <Box
              sx={{
                aspectRatio: "4 / 3",
                bgcolor: "dct.photoBg",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <PhotoImg src={set.imageUrl} alt={set.title} sx={{ p: 1 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6">{castingDisplayName(set.title)}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                {[set.manufacturer, t(`setTypes.${set.setType}`), set.toyNumber, set.year]
                  .filter(Boolean)
                  .join(" · ")}
              </Typography>
              {set.cars.length ? (
                <>
                  <Typography variant="overline" component="div" sx={{ color: "dct.text3" }}>
                    {t("sets.vehiclesIncluded")}
                  </Typography>
                  <Box
                    component="ol"
                    sx={{ m: 0, pl: 2.5, color: "text.secondary", columns: { md: 2 } }}
                  >
                    {set.cars.map((car, index) => (
                      <li key={index}>{car.color ? `${car.name} (${car.color})` : car.name}</li>
                    ))}
                  </Box>
                </>
              ) : null}
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                disabled={busy}
                onClick={() => {
                  onMatch({ set, addPhoto });
                  setSelected(null);
                }}
              >
                {t("catalog.useThisSet")}
              </Button>
            </Box>
          </Box>
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

export default SetCatalogMatchDialog;
