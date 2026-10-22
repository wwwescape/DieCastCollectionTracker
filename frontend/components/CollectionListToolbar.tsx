import { useRef, useState, type ReactNode } from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid2";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import AutocompleteMultiSelect from "./AutocompleteMultiSelect";
import AutocompleteSelect from "./AutocompleteSelect";

// One filter in the Filters dialog: a multi-select plus its Exclude flag and, for a field an
// item can have several values of (tags), a Match any / Match all toggle.
export interface FilterField<T> {
  key: string;
  label: string;
  options: T[];
  selected: T[];
  onChange: (value: T[]) => void;
  getOptionLabel: (option: T) => string;
  isOptionEqualToValue: (option: T, value: T) => boolean;
  exclude: boolean;
  onExcludeChange: (value: boolean) => void;
  matchAll?: boolean;
  onMatchAllChange?: (value: boolean) => void;
}

export interface SortOption {
  value: string;
  label: string;
}

export interface BulkAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface CollectionListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  // Each entry's own type varies (ids, enum values...), so the list itself is loosely typed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: FilterField<any>[];
  onClearFilters: () => void;
  sortOptions: SortOption[];
  sort: string;
  onSortChange: (value: string) => void;
  selectLabel: string;
  selectionMode: boolean;
  selectedCount: number;
  visibleCount: number;
  allVisibleSelected: boolean;
  onEnterSelectionMode: () => void;
  onExitSelectionMode: () => void;
  onToggleSelectAll: () => void;
  onBulkDelete: () => void;
  bulkActions: BulkAction[];
}

interface FilterFieldOptionsProps {
  selectedCount: number;
  exclude: boolean;
  onExcludeChange: (value: boolean) => void;
  matchAll?: boolean;
  onMatchAllChange?: (value: boolean) => void;
}

// The row under each filter field: Exclude on the left and, where it makes sense, Match any /
// Match all on the right. Exclude needs something picked; Match all needs two.
const FilterFieldOptions = ({
  selectedCount,
  exclude,
  onExcludeChange,
  matchAll = false,
  onMatchAllChange,
}: FilterFieldOptionsProps) => {
  const { t } = useTranslation();
  return (
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}>
      <FormControlLabel
        sx={{ ml: 0 }}
        control={
          <Checkbox
            size="small"
            checked={exclude}
            disabled={selectedCount === 0}
            onChange={(event) => onExcludeChange(event.target.checked)}
          />
        }
        label={t("listToolbar.exclude")}
      />
      {onMatchAllChange ? (
        // A span so the tooltip still shows while the group is disabled.
        <Tooltip title={t("listToolbar.matchModeTooltip")}>
          <span>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={matchAll ? "all" : "any"}
              onChange={(_event, value: "any" | "all" | null) => {
                if (value) onMatchAllChange(value === "all");
              }}
              disabled={selectedCount < 2}
              aria-label={t("listToolbar.matchMode")}
            >
              <ToggleButton value="any" sx={{ py: 0.25, textTransform: "none" }}>
                {t("listToolbar.matchAny")}
              </ToggleButton>
              <ToggleButton value="all" sx={{ py: 0.25, textTransform: "none" }}>
                {t("listToolbar.matchAll")}
              </ToggleButton>
            </ToggleButtonGroup>
          </span>
        </Tooltip>
      ) : null}
    </Stack>
  );
};

// The Vehicles and Sets toolbar, modelled on VideoGameTrackarr's Games toolbar: search, a
// Filters & Sort dialog behind a badge showing how many filter values are active, and a
// selection mode with Select all, Remove and a menu of further bulk actions.
const CollectionListToolbar = ({
  search,
  onSearchChange,
  filters,
  onClearFilters,
  sortOptions,
  sort,
  onSortChange,
  selectLabel,
  selectionMode,
  selectedCount,
  visibleCount,
  allVisibleSelected,
  onEnterSelectionMode,
  onExitSelectionMode,
  onToggleSelectAll,
  onBulkDelete,
  bulkActions,
}: CollectionListToolbarProps) => {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tab, setTab] = useState<"filter" | "sort">("filter");
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonGroupRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = filters.reduce((total, field) => total + field.selected.length, 0);
  const selectedSort = sortOptions.find((option) => option.value === sort) ?? sortOptions[0];

  if (selectionMode) {
    return (
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
        <Stack direction="row" spacing={{ xs: 0.5, sm: 1.5 }} sx={{ alignItems: "center" }}>
          <IconButton onClick={onExitSelectionMode} aria-label={t("listToolbar.exitSelection")}>
            <CloseIcon />
          </IconButton>
          <Typography variant="subtitle1" noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
            {t("listToolbar.selectedCount", { count: selectedCount })}
          </Typography>
          <Tooltip
            title={allVisibleSelected ? t("listToolbar.deselectAll") : t("listToolbar.selectAll")}
          >
            <span>
              <IconButton
                onClick={onToggleSelectAll}
                aria-label={
                  allVisibleSelected ? t("listToolbar.deselectAll") : t("listToolbar.selectAll")
                }
                aria-pressed={allVisibleSelected}
                disabled={visibleCount === 0}
                color={allVisibleSelected ? "primary" : "default"}
                sx={{ bgcolor: allVisibleSelected ? "action.selected" : undefined }}
              >
                <DoneAllIcon />
              </IconButton>
            </span>
          </Tooltip>
          <ButtonGroup
            ref={buttonGroupRef}
            color="error"
            variant="contained"
            disabled={selectedCount === 0}
          >
            {/* Icon-only on phones, so the whole bar fits on one line. */}
            <Button onClick={onBulkDelete} aria-label={t("listToolbar.remove")}>
              <DeleteIcon fontSize="small" />
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, ml: 1 }}>
                {t("listToolbar.remove")}
              </Box>
            </Button>
            {bulkActions.length ? (
              <Button
                size="small"
                onClick={() => setMenuOpen(true)}
                aria-label={t("listToolbar.moreActions")}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <ArrowDropDownIcon />
              </Button>
            ) : null}
          </ButtonGroup>
          <Menu
            anchorEl={buttonGroupRef.current}
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            {bulkActions.map((action) => (
              <MenuItem
                key={action.key}
                onClick={() => {
                  setMenuOpen(false);
                  action.onClick();
                }}
              >
                <ListItemIcon>{action.icon}</ListItemIcon>
                <ListItemText>{action.label}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
      <Stack direction="row" spacing={1}>
        <TextField
          label={t("common.search")}
          placeholder={t("listToolbar.searchPlaceholder")}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => onSearchChange("")}
                    aria-label={t("listToolbar.clearSearch")}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <Tooltip title={t("listToolbar.filtersAndSort")}>
          <IconButton
            onClick={() => setFiltersOpen(true)}
            aria-label={t("listToolbar.filtersAndSort")}
            sx={{ alignSelf: "center" }}
          >
            <Badge badgeContent={activeFilterCount} color="primary">
              <FilterListIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        <Tooltip title={selectLabel}>
          <span style={{ alignSelf: "center" }}>
            <IconButton
              onClick={onEnterSelectionMode}
              aria-label={selectLabel}
              disabled={visibleCount === 0}
            >
              <CheckBoxOutlineBlankIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t("listToolbar.filtersAndSort")}</DialogTitle>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)} variant="fullWidth">
          <Tab value="filter" label={t("listToolbar.filterTab")} />
          <Tab value="sort" label={t("listToolbar.sortTab")} />
        </Tabs>
        <DialogContent>
          {tab === "filter" ? (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {filters.map((field) => (
                <Grid key={field.key} size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.5}>
                    <AutocompleteMultiSelect
                      label={field.label}
                      options={field.options}
                      value={field.selected}
                      onChange={field.onChange}
                      getOptionLabel={field.getOptionLabel}
                      isOptionEqualToValue={field.isOptionEqualToValue}
                      placeholder={t("listToolbar.allPlaceholder")}
                      fullWidth
                    />
                    <FilterFieldOptions
                      selectedCount={field.selected.length}
                      exclude={field.exclude}
                      onExcludeChange={field.onExcludeChange}
                      matchAll={field.matchAll}
                      onMatchAllChange={field.onMatchAllChange}
                    />
                  </Stack>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <AutocompleteSelect<SortOption>
                  label={t("listToolbar.sortBy")}
                  options={sortOptions}
                  value={selectedSort}
                  onChange={(newValue) => onSortChange(newValue?.value ?? sortOptions[0].value)}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, val) => option.value === val.value}
                  disableClearable
                  fullWidth
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {tab === "filter" ? (
            <Button onClick={onClearFilters} disabled={activeFilterCount === 0}>
              {t("listToolbar.clearFilters")}
            </Button>
          ) : null}
          <Button onClick={() => setFiltersOpen(false)} variant="contained">
            {t("listToolbar.close")}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CollectionListToolbar;
