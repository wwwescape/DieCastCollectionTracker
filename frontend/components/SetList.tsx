import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import Grid from "@mui/material/Grid2";
import { useTranslation } from "react-i18next";
import { SET_TYPES, type CarStatus, type SetType } from "../api/types";
import { useManufacturers } from "../hooks/useLookups";
import { useSetList } from "../hooks/useSets";
import AutocompleteSelect from "./AutocompleteSelect";
import CollectionSubNav from "./CollectionSubNav";
import SetCard from "./SetCard";
import VirtualCarGrid from "./VirtualCarGrid";

type StatusFilter = CarStatus | "all";
const STATUS_FILTERS: StatusFilter[] = ["all", "owned", "wishlist"];

const SetList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [setType, setSetType] = useState<SetType | null>(null);
  const [manufacturerId, setManufacturerId] = useState<number | null>(null);

  const { data: manufacturers } = useManufacturers();
  const { data: sets, isLoading } = useSetList({
    search: search || undefined,
    manufacturerId: manufacturerId ?? undefined,
    setType: setType ?? undefined,
    status: status === "all" ? undefined : status,
  });

  const statusLabel = (value: StatusFilter) =>
    value === "all" ? t("common.all") : t(`status.${value}`);

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h4" component="h1">
          {t("sets.title")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/collection/sets/add")}
        >
          {t("sets.addSet")}
        </Button>
      </Stack>
      <CollectionSubNav />

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label={t("common.search")}
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AutocompleteSelect<StatusFilter>
              label={t("common.status")}
              fullWidth
              disableClearable
              options={STATUS_FILTERS}
              value={status}
              getOptionLabel={statusLabel}
              onChange={(newValue) => setStatus(newValue ?? "all")}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AutocompleteSelect<SetType>
              label={t("common.type")}
              fullWidth
              options={SET_TYPES}
              value={setType}
              getOptionLabel={(option) => t(`setTypes.${option}`)}
              onChange={(newValue) => setSetType(newValue)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AutocompleteSelect
              label={t("common.manufacturer")}
              fullWidth
              options={manufacturers ?? []}
              value={manufacturers?.find((m) => m.id === manufacturerId) ?? null}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, val) => option.id === val.id}
              onChange={(newValue) => setManufacturerId(newValue?.id ?? null)}
            />
          </Grid>
        </Grid>
      </Paper>

      {isLoading ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>
      ) : !sets?.length ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("sets.noneFound")}</Paper>
      ) : (
        <VirtualCarGrid
          items={sets}
          getKey={(set) => set.id}
          renderItem={(set) => (
            <SetCard set={set} onClick={() => navigate(`/collection/sets/${set.id}/edit`)} />
          )}
        />
      )}
    </Stack>
  );
};

export default SetList;
