import { useEffect, useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { BulkEditInput } from "../api/listFilters";
import { CAR_CONDITIONS, type CarCondition, type CarStatus } from "../api/types";
import { useSeries } from "../hooks/useLookups";
import AutocompleteSelect from "./AutocompleteSelect";
import FreeSoloLookupField from "./FreeSoloLookupField";

export type BulkEditField = "status" | "condition" | "series";

type BulkChange = Omit<BulkEditInput, "ids">;

interface BulkEditDialogProps {
  field: BulkEditField | null;
  count: number;
  busy: boolean;
  onClose: () => void;
  onApply: (change: BulkChange) => void;
}

const NO_CONDITION = "none";

// Set status / Set condition / Set series for every selected vehicle or set — the Vehicles
// and Sets lists' extra bulk actions. One field per dialog, applied in a single request.
const BulkEditDialog = ({ field, count, busy, onClose, onApply }: BulkEditDialogProps) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CarStatus>("owned");
  const [condition, setCondition] = useState<CarCondition | typeof NO_CONDITION>(NO_CONDITION);
  const [series, setSeries] = useState("");
  const [clearSeries, setClearSeries] = useState(false);
  const { data: allSeries } = useSeries();

  // Series names repeat across manufacturers ("HW Art Cars" under Hot Wheels and Matchbox);
  // offer each name once, since it's applied under each item's own manufacturer anyway.
  const seriesOptions = useMemo(
    () =>
      [...new Set((allSeries ?? []).map((item) => item.name))]
        .sort((a, b) => a.localeCompare(b))
        .map((name, index) => ({ id: index, name })),
    [allSeries]
  );

  useEffect(() => {
    if (field) {
      setStatus("owned");
      setCondition(NO_CONDITION);
      setSeries("");
      setClearSeries(false);
    }
  }, [field]);

  const conditionOptions: (CarCondition | typeof NO_CONDITION)[] = [
    NO_CONDITION,
    ...CAR_CONDITIONS,
  ];
  const canApply = field !== "series" || clearSeries || series.trim().length > 0;

  const apply = () => {
    if (field === "status") onApply({ status });
    if (field === "condition")
      onApply({ condition: condition === NO_CONDITION ? null : condition });
    if (field === "series") onApply({ series: clearSeries ? null : series.trim() });
  };

  const title =
    field === "status"
      ? t("bulk.statusTitle")
      : field === "condition"
        ? t("bulk.conditionTitle")
        : t("bulk.seriesTitle");

  return (
    <Dialog open={field !== null} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t("bulk.appliesTo", { count })}
          </Typography>
          {field === "status" ? (
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={status}
              onChange={(_event, value: CarStatus | null) => value && setStatus(value)}
              aria-label={t("common.status")}
            >
              <ToggleButton value="owned">{t("status.owned")}</ToggleButton>
              <ToggleButton value="wishlist">{t("status.wishlist")}</ToggleButton>
            </ToggleButtonGroup>
          ) : null}
          {field === "condition" ? (
            <AutocompleteSelect
              label={t("vehicles.condition")}
              options={conditionOptions}
              value={condition}
              onChange={(value) => setCondition(value ?? NO_CONDITION)}
              getOptionLabel={(option) =>
                option === NO_CONDITION ? t("conditions.notSpecified") : t(`conditions.${option}`)
              }
              disableClearable
              fullWidth
            />
          ) : null}
          {field === "series" ? (
            <>
              {clearSeries ? null : (
                <FreeSoloLookupField
                  label={t("vehicles.series")}
                  options={seriesOptions}
                  value={series}
                  onChange={setSeries}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                {t("bulk.seriesHelp")}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={clearSeries}
                    onChange={(event) => setClearSeries(event.target.checked)}
                  />
                }
                label={t("bulk.clearSeries")}
              />
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="contained" onClick={apply} disabled={!canApply || busy}>
          {t("bulk.apply")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkEditDialog;
