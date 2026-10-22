import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import LabelIcon from "@mui/icons-material/Label";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import { useTagCoverage } from "../hooks/useTags";

type ManageTagsTab = "add" | "remove";

interface ManageTagsDialogProps {
  open: boolean;
  vehicleIds?: number[];
  setIds?: number[];
  busy: boolean;
  onClose: () => void;
  onApply: (change: { addTags?: string[]; removeTagIds?: number[] }) => void;
}

// The bulk Tags dialog, ported from VideoGameTrackarr: two checklists (Add / Remove) over
// every tag, each showing how many of the selected items already carry it ("3 of 5"). Add
// also takes brand-new tag names, created when applied.
const ManageTagsDialog = ({
  open,
  vehicleIds = [],
  setIds = [],
  busy,
  onClose,
  onApply,
}: ManageTagsDialogProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ManageTagsTab>("add");
  const [search, setSearch] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [addChecked, setAddChecked] = useState<Set<number>>(new Set());
  const [removeChecked, setRemoveChecked] = useState<Set<number>>(new Set());
  const total = vehicleIds.length + setIds.length;
  const { data: coverage = [], isLoading } = useTagCoverage(vehicleIds, setIds, open);

  // Fresh state each time the dialog opens for a new selection.
  useEffect(() => {
    if (open) {
      setTab("add");
      setSearch("");
      setNewTagName("");
      setNewTags([]);
      setAddChecked(new Set());
      setRemoveChecked(new Set());
    }
  }, [open]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    // Removing only makes sense for tags at least one selected item has.
    const pool = tab === "remove" ? coverage.filter((tag) => tag.count > 0) : coverage;
    return query ? pool.filter((tag) => tag.name.toLowerCase().includes(query)) : pool;
  }, [coverage, search, tab]);

  const checked = tab === "add" ? addChecked : removeChecked;
  const setChecked = tab === "add" ? setAddChecked : setRemoveChecked;
  const checkedCount = checked.size + (tab === "add" ? newTags.length : 0);

  const toggle = (tagId: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });

  const addNewTag = () => {
    const name = newTagName.trim();
    if (!name) return;
    const existing = coverage.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setAddChecked((prev) => new Set(prev).add(existing.id));
    } else if (!newTags.some((tag) => tag.toLowerCase() === name.toLowerCase())) {
      setNewTags((prev) => [...prev, name]);
    }
    setNewTagName("");
  };

  const apply = () => {
    if (tab === "add") {
      const names = coverage.filter((tag) => addChecked.has(tag.id)).map((tag) => tag.name);
      onApply({ addTags: [...names, ...newTags] });
    } else {
      onApply({ removeTagIds: Array.from(removeChecked) });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("bulk.tagsTitle")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("bulk.appliesTo", { count: total })}
        </Typography>
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab value="add" label={t("bulk.addTab")} />
          <Tab value="remove" label={t("bulk.removeTab")} />
        </Tabs>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {tab === "add" ? t("bulk.addDescription") : t("bulk.removeDescription")}
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("bulk.searchTags")}
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box
          sx={{
            maxHeight: 360,
            overflowY: "auto",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          {tab === "add"
            ? newTags.map((name) => (
                <Stack
                  key={`new:${name}`}
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: "center",
                    px: 1,
                    py: 0.5,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Checkbox
                    checked
                    size="small"
                    onChange={() => setNewTags((prev) => prev.filter((tag) => tag !== name))}
                    slotProps={{ input: { "aria-label": name } }}
                  />
                  <Chip label={name} size="small" />
                  <Box sx={{ flexGrow: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {t("bulk.newTag")}
                  </Typography>
                </Stack>
              ))
            : null}
          {isLoading ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              {t("common.loading")}
            </Typography>
          ) : visible.length === 0 && (tab === "remove" || newTags.length === 0) ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              {t("bulk.noTags")}
            </Typography>
          ) : (
            visible.map((tag) => (
              <Stack
                key={tag.id}
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  px: 1,
                  py: 0.5,
                  "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" },
                }}
              >
                <Checkbox
                  checked={checked.has(tag.id)}
                  onChange={() => toggle(tag.id)}
                  size="small"
                  slotProps={{ input: { "aria-label": tag.name } }}
                />
                <Chip
                  label={tag.name}
                  size="small"
                  sx={tag.color ? { bgcolor: tag.color, color: "common.white" } : undefined}
                />
                <Box sx={{ flexGrow: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  {t("bulk.coverage", { count: tag.count, total })}
                </Typography>
              </Stack>
            ))
          )}
        </Box>
        {tab === "add" ? (
          <TextField
            fullWidth
            size="small"
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addNewTag();
              }
            }}
            placeholder={t("bulk.newTagPlaceholder")}
            helperText={t("bulk.newTagHelp")}
            sx={{ mt: 2 }}
          />
        ) : null}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
        <Typography variant="body2">{t("bulk.tagsChecked", { count: checkedCount })}</Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            color={tab === "remove" ? "error" : "primary"}
            startIcon={tab === "add" ? <LabelIcon /> : <DeleteIcon />}
            onClick={apply}
            disabled={checkedCount === 0 || busy}
          >
            {tab === "add" ? t("bulk.addSubmit") : t("bulk.removeSubmit")}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default ManageTagsDialog;
