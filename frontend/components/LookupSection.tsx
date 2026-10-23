import { useState, type ReactNode } from "react";
import CallMergeIcon from "@mui/icons-material/CallMerge";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/EditOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { LookupKind, LookupUsage } from "../api/lookups";
import ConfirmDialog from "./ConfirmDialog";
import { MergeLookupDialog, RenameLookupDialog } from "./LookupDialogs";

export interface LookupItem {
  id: number;
  label: string;
  secondary?: string;
  color?: string | null;
  // Entries can only merge within the same group: a series' manufacturer.
  group?: number | null;
}

interface LookupSectionProps {
  kind: LookupKind;
  title: string;
  items: LookupItem[];
  usage?: LookupUsage[];
  isLoading?: boolean;
  onDelete: (id: number) => void;
  children: ReactNode;
}

// One Lookups list. Each entry shows what uses it and whether it comes from the wiki, with
// Rename, Merge and Delete — each disabled, with the reason as its tooltip, when it isn't
// allowed: a wiki-backed entry can't be renamed or merged away (the next Re-match would bring
// the old name back), and an entry still in use can't be deleted (tags excepted: deleting one
// just takes it off its items, after a confirmation).
const LookupSection = ({
  kind,
  title,
  items,
  usage,
  isLoading,
  onDelete,
  children,
}: LookupSectionProps) => {
  const { t } = useTranslation();
  const usageById = new Map((usage ?? []).map((row) => [row.id, row]));
  const [renaming, setRenaming] = useState<LookupItem | null>(null);
  const [merging, setMerging] = useState<LookupItem | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<LookupItem | null>(null);

  const usageOf = (item: LookupItem) => usageById.get(item.id);
  const usageText = (item: LookupItem) => {
    const row = usageOf(item);
    if (!row || (!row.carCount && !row.setCount)) return t("lookups.unused");
    return [
      row.carCount ? t("common.vehicleCount", { count: row.carCount }) : null,
      row.setCount ? t("common.setCount", { count: row.setCount }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  };
  const candidatesFor = (item: LookupItem) =>
    items.filter(
      (other) => other.id !== item.id && (kind !== "series" || other.group === item.group)
    );

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ mb: 2 }}>{children}</Box>
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
          {t("lookups.noneYet")}
        </Typography>
      ) : (
        <Box
          component="ul"
          sx={{ listStyle: "none", m: 0, p: 0, borderTop: 1, borderColor: "divider" }}
        >
          {items.map((item) => {
            const row = usageOf(item);
            const wikiBacked = Boolean(row?.wikiBacked);
            const inUse = Boolean(row && (row.carCount || row.setCount));
            const canMerge = !wikiBacked && candidatesFor(item).length > 0;
            const deleteBlocked = inUse && kind !== "tags";
            return (
              <Box
                component="li"
                key={item.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  py: 1,
                  px: 0.5,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                {item.color ? (
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      bgcolor: item.color,
                      border: 1,
                      borderColor: "divider",
                      flexShrink: 0,
                    }}
                  />
                ) : null}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                    {wikiBacked ? (
                      <Tooltip title={t("lookups.wikiBackedHelp")}>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            px: 0.75,
                            borderRadius: 2.5,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "primary.main",
                            bgcolor: "dct.accentSoft",
                            "& svg": { fontSize: 13 },
                          }}
                        >
                          <MenuBookIcon />
                          {t("lookups.fromWiki")}
                        </Box>
                      </Tooltip>
                    ) : null}
                  </Box>
                  <Typography variant="caption" component="div" sx={{ color: "dct.text3" }}>
                    {[item.secondary, row ? usageText(item) : null].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
                <Tooltip title={wikiBacked ? t("lookups.cantRenameWiki") : t("lookups.rename")}>
                  <span>
                    <IconButton
                      size="small"
                      aria-label={t("lookups.renameItem", { name: item.label })}
                      disabled={wikiBacked}
                      onClick={() => setRenaming(item)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip
                  title={
                    wikiBacked
                      ? t("lookups.cantMergeWiki")
                      : canMerge
                        ? t("lookups.merge")
                        : t("lookups.nothingToMergeInto")
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      aria-label={t("lookups.mergeItem", { name: item.label })}
                      disabled={!canMerge}
                      onClick={() => setMerging(item)}
                    >
                      <CallMergeIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip
                  title={
                    deleteBlocked
                      ? t("lookups.cantDeleteInUse", { usage: usageText(item) })
                      : t("common.delete")
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      aria-label={t("common.deleteItem", { name: item.label })}
                      disabled={deleteBlocked}
                      onClick={() => (inUse ? setConfirmingDelete(item) : onDelete(item.id))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      )}
      {renaming ? (
        <RenameLookupDialog
          key={renaming.id}
          kind={kind}
          item={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}
      {merging ? (
        <MergeLookupDialog
          key={merging.id}
          kind={kind}
          item={merging}
          candidates={candidatesFor(merging)}
          usageText={usageText(merging)}
          onClose={() => setMerging(null)}
        />
      ) : null}
      <ConfirmDialog
        open={confirmingDelete !== null}
        title={t("lookups.deleteTagTitle", { name: confirmingDelete?.label ?? "" })}
        description={t("lookups.deleteTagDescription", {
          name: confirmingDelete?.label ?? "",
          usage: confirmingDelete ? usageText(confirmingDelete) : "",
        })}
        confirmLabel={t("common.delete")}
        confirmColor="error"
        onClose={() => setConfirmingDelete(null)}
        onConfirm={() => {
          if (confirmingDelete) onDelete(confirmingDelete.id);
          setConfirmingDelete(null);
        }}
      />
    </Paper>
  );
};

export default LookupSection;
