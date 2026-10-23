import { useState, type ReactNode } from "react";
import AddCircleIcon from "@mui/icons-material/AddCircleOutline";
import CheckBoxIcon from "@mui/icons-material/CheckBoxOutlined";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import FilterListIcon from "@mui/icons-material/FilterList";
import GridViewIcon from "@mui/icons-material/GridView";
import SearchIcon from "@mui/icons-material/Search";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import TableRowsIcon from "@mui/icons-material/TableRowsOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import ViewAgendaIcon from "@mui/icons-material/ViewAgendaOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid2";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import AutocompleteMultiSelect from "./AutocompleteMultiSelect";
import { ToolbarButton, ToolbarDivider } from "./Page";

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

// "cards" is Photos for things without photos of their own (series, manufacturers).
export type ListView = "photos" | "cards" | "table" | "overview";

export const CARD_SIZE_MIN = 140;
export const CARD_SIZE_MAX = 300;
export const CARD_SIZE_DEFAULT = 190;

interface CollectionListToolbarProps {
  // Leave out on pages you don't add to from here (Series, Manufacturers).
  addLabel?: string;
  addTo?: string;
  // The views this page offers, first is the default; card size applies to photos and cards.
  views?: ListView[];
  view: ListView;
  onViewChange: (value: ListView) => void;
  cardSize: number;
  onCardSizeChange: (value: number) => void;
  // Each entry's own type varies (ids, enum values...), so the list itself is loosely typed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: FilterField<any>[];
  onClearFilters: () => void;
  sortOptions: SortOption[];
  sort: string;
  onSortChange: (value: string) => void;
  // Selection and bulk actions: leave out on pages without them.
  selectLabel?: string;
  selectionMode?: boolean;
  selectedCount?: number;
  visibleCount: number;
  allVisibleSelected?: boolean;
  onEnterSelectionMode?: () => void;
  onExitSelectionMode?: () => void;
  onToggleSelectAll?: () => void;
  onBulkDelete?: () => void;
  bulkActions?: BulkAction[];
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
              <ToggleButton value="any" sx={{ py: 0.25 }}>
                {t("listToolbar.matchAny")}
              </ToggleButton>
              <ToggleButton value="all" sx={{ py: 0.25 }}>
                {t("listToolbar.matchAll")}
              </ToggleButton>
            </ToggleButtonGroup>
          </span>
        </Tooltip>
      ) : null}
    </Stack>
  );
};

// A menu choice with a tick on the current one.
const CheckedItem = ({
  checked,
  icon,
  label,
  onClick,
}: {
  checked: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <MenuItem selected={checked} onClick={onClick} role="menuitemradio" aria-checked={checked}>
    {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
    <ListItemText>{label}</ListItemText>
    <CheckIcon
      fontSize="small"
      sx={{ ml: 2, visibility: checked ? "visible" : "hidden", color: "primary.main" }}
    />
  </MenuItem>
);

type MenuName = "options" | "view" | "sort" | "bulk";

// The Vehicles and Sets toolbar: Add and Select on the left; Options (card
// size), View, Sort and Filter on the right. Filter opens the full dialog with Exclude and
// Match all per field. Selection mode swaps the row for Done, Select all, the bulk actions and
// Remove.
const CollectionListToolbar = ({
  addLabel,
  addTo,
  views: viewKeys = ["photos", "table", "overview"],
  view,
  onViewChange,
  cardSize,
  onCardSizeChange,
  filters,
  onClearFilters,
  sortOptions,
  sort,
  onSortChange,
  selectLabel,
  selectionMode = false,
  selectedCount = 0,
  visibleCount,
  allVisibleSelected = false,
  onEnterSelectionMode,
  onExitSelectionMode,
  onToggleSelectAll,
  onBulkDelete,
  bulkActions = [],
}: CollectionListToolbarProps) => {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menu, setMenu] = useState<{ name: MenuName; anchor: HTMLElement } | null>(null);
  const openMenu = (name: MenuName) => (event: React.MouseEvent<HTMLElement>) =>
    setMenu({ name, anchor: event.currentTarget });
  const closeMenu = () => setMenu(null);

  const activeFilterCount = filters.reduce((total, field) => total + field.selected.length, 0);

  if (selectionMode) {
    const allLabel = allVisibleSelected ? t("listToolbar.deselectAll") : t("listToolbar.selectAll");
    return (
      <>
        <ToolbarButton
          icon={<CloseIcon />}
          label={t("listToolbar.done")}
          onClick={onExitSelectionMode}
          hideLabelOnPhone
          aria-label={t("listToolbar.exitSelection")}
        />
        <Typography variant="subtitle2" noWrap sx={{ px: 1 }}>
          {t("listToolbar.selectedCount", { count: selectedCount })}
        </Typography>
        <ToolbarButton
          icon={<DoneAllIcon />}
          label={allLabel}
          onClick={onToggleSelectAll}
          active={allVisibleSelected}
          disabled={visibleCount === 0}
        />
        <Box sx={{ flexGrow: 1 }} />
        {/* Desktop: every bulk action has its own button; phones fold them into a menu. */}
        <Box sx={{ display: { xs: "none", md: "contents" } }}>
          {bulkActions.map((action) => (
            <ToolbarButton
              key={action.key}
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
              disabled={selectedCount === 0}
            />
          ))}
        </Box>
        {bulkActions.length ? (
          <Box sx={{ display: { xs: "contents", md: "none" } }}>
            <ToolbarButton
              icon={<TuneIcon />}
              label={t("listToolbar.edit")}
              onClick={openMenu("bulk")}
              disabled={selectedCount === 0}
              aria-label={t("listToolbar.moreActions")}
              aria-haspopup="menu"
            />
          </Box>
        ) : null}
        <ToolbarDivider />
        <ToolbarButton
          icon={<DeleteIcon />}
          label={t("listToolbar.remove")}
          onClick={onBulkDelete}
          danger
          disabled={selectedCount === 0}
        />
        <Menu anchorEl={menu?.anchor} open={menu?.name === "bulk"} onClose={closeMenu}>
          {bulkActions.map((action) => (
            <MenuItem
              key={action.key}
              onClick={() => {
                closeMenu();
                action.onClick();
              }}
            >
              <ListItemIcon>{action.icon}</ListItemIcon>
              <ListItemText>{action.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  const allViews: Record<ListView, { label: string; icon: ReactNode }> = {
    photos: { label: t("listToolbar.viewPhotos"), icon: <GridViewIcon fontSize="small" /> },
    cards: { label: t("listToolbar.viewCards"), icon: <GridViewIcon fontSize="small" /> },
    table: { label: t("listToolbar.viewTable"), icon: <TableRowsIcon fontSize="small" /> },
    overview: { label: t("listToolbar.viewOverview"), icon: <ViewAgendaIcon fontSize="small" /> },
  };
  const views = viewKeys.map((value) => ({ value, ...allViews[value] }));
  const currentView = views.find((option) => option.value === view) ?? views[0];

  return (
    <>
      {addLabel && addTo ? (
        <ToolbarButton icon={<AddCircleIcon />} label={addLabel} to={addTo} primary />
      ) : null}
      {onEnterSelectionMode ? (
        <ToolbarButton
          icon={<CheckBoxIcon />}
          label={t("listToolbar.select")}
          aria-label={selectLabel}
          onClick={onEnterSelectionMode}
          disabled={visibleCount === 0}
        />
      ) : null}
      <Box sx={{ flexGrow: 1 }} />
      {view === "photos" || view === "cards" ? (
        <ToolbarButton
          icon={<TuneIcon />}
          label={t("listToolbar.options")}
          onClick={openMenu("options")}
          aria-haspopup="menu"
        />
      ) : null}
      <ToolbarButton
        icon={currentView.icon}
        label={t("listToolbar.view")}
        onClick={openMenu("view")}
        aria-haspopup="menu"
      />
      <ToolbarButton
        icon={<SwapVertIcon />}
        label={t("listToolbar.sortTab")}
        onClick={openMenu("sort")}
        aria-haspopup="menu"
      />
      {filters.length ? (
        <ToolbarButton
          icon={<FilterListIcon />}
          label={t("listToolbar.filterTab")}
          onClick={() => setFiltersOpen(true)}
          active={activeFilterCount > 0}
          count={activeFilterCount}
          aria-label={t("listToolbar.filters")}
        />
      ) : null}

      <Menu anchorEl={menu?.anchor} open={menu?.name === "options"} onClose={closeMenu}>
        <ListSubheader sx={{ lineHeight: "28px", bgcolor: "transparent" }}>
          {t("listToolbar.cardSize")}
        </ListSubheader>
        <Box sx={{ px: 2.5, pb: 1, width: 240 }}>
          <Slider
            size="small"
            min={CARD_SIZE_MIN}
            max={CARD_SIZE_MAX}
            step={10}
            value={cardSize}
            onChange={(_event, value) => onCardSizeChange(value as number)}
            aria-label={t("listToolbar.cardSize")}
          />
        </Box>
      </Menu>
      <Menu anchorEl={menu?.anchor} open={menu?.name === "view"} onClose={closeMenu}>
        {views.map((option) => (
          <CheckedItem
            key={option.value}
            checked={option.value === view}
            icon={option.icon}
            label={option.label}
            onClick={() => {
              onViewChange(option.value);
              closeMenu();
            }}
          />
        ))}
      </Menu>
      <Menu anchorEl={menu?.anchor} open={menu?.name === "sort"} onClose={closeMenu}>
        {sortOptions.map((option) => (
          <CheckedItem
            key={option.value}
            checked={option.value === sort}
            label={option.label}
            onClick={() => {
              onSortChange(option.value);
              closeMenu();
            }}
          />
        ))}
      </Menu>

      <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t("listToolbar.filters")}</DialogTitle>
        <Divider />
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={onClearFilters} disabled={activeFilterCount === 0}>
            {t("listToolbar.clearFilters")}
          </Button>
          <Button onClick={() => setFiltersOpen(false)} variant="contained">
            {t("listToolbar.close")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CollectionListToolbar;

interface ListSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// The list's own search, beside the breadcrumbs: narrows what's shown here, where the header
// search jumps to a single item.
export const ListSearchField = ({ value, onChange, placeholder }: ListSearchFieldProps) => {
  const { t } = useTranslation();
  return (
    <TextField
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder ?? t("listToolbar.searchPlaceholder")}
      sx={{ width: { xs: "100%", sm: 320 } }}
      slotProps={{
        htmlInput: { "aria-label": t("common.search") },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: "dct.text3" }} />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => onChange("")}
                aria-label={t("listToolbar.clearSearch")}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
    />
  );
};
