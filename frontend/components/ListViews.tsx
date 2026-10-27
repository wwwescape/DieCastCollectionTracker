import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Checkbox from "@mui/material/Checkbox";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { CarStatus } from "../api/types";
import VirtualCarGrid, { type VirtualGridHandle } from "./VirtualCarGrid";
import PhotoImg from "./PhotoImg";

const LETTERS = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
// The rail sticks just under the header and page toolbar.
const RAIL_TOP_PX = 120;
const RAIL_BOTTOM_GAP_PX = 16;
// Each letter's row: the mockup's compact 19px, shrinking on short windows (never below 10px)
// so the whole rail always fits in the window.
const LETTER_MAX_PX = 19;
const LETTER_MIN_PX = 10;

const letterOf = (name: string) => {
  const first = name.trim().charAt(0).toUpperCase();
  return first >= "A" && first <= "Z" ? first : "#";
};

// Quiet bordered box for "Loading…", "Nothing here yet" and the like.
export const EmptyState = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      p: 4,
      textAlign: "center",
      color: "text.secondary",
      border: 1,
      borderStyle: "dashed",
      borderColor: "dct.borderStrong",
      borderRadius: 2,
    }}
  >
    {children}
  </Box>
);

interface PhotoGridProps<T> {
  items: T[];
  getKey: (item: T) => number;
  getName: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  cardSize: number;
  // The A–Z rail only makes sense while the list is sorted by name, A first.
  showRail: boolean;
}

// Photo cards with an A–Z jump rail down the right-hand side on desktop.
export function PhotoGrid<T>({
  items,
  getKey,
  getName,
  renderItem,
  cardSize,
  showRail,
}: PhotoGridProps<T>) {
  const { t } = useTranslation();
  const gridRef = useRef<VirtualGridHandle>(null);
  const firstIndex = useMemo(() => {
    const map = new Map<string, number>();
    if (!showRail) return map;
    items.forEach((item, index) => {
      const letter = letterOf(getName(item));
      if (!map.has(letter)) map.set(letter, index);
    });
    return map;
  }, [items, getName, showRail]);

  return (
    <Box sx={{ display: "flex", gap: 1.25 }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <VirtualCarGrid
          items={items}
          getKey={getKey}
          renderItem={renderItem}
          minItemWidth={cardSize}
          handleRef={gridRef}
        />
      </Box>
      {showRail ? (
        <AzRail
          label={t("listToolbar.jumpTo")}
          firstIndex={firstIndex}
          onJump={(index) => gridRef.current?.scrollToIndex(index)}
        />
      ) : null}
    </Box>
  );
}

interface AzRailProps {
  label: string;
  firstIndex: Map<string, number>;
  onJump: (index: number) => void;
}

// The # A–Z jump rail. Compact like the mockup, and always entirely inside the window: the
// letters shrink on a short window. The room it has is measured live, since it changes as
// the rail scrolls up into its sticky spot under the toolbar.
function AzRail({ label, firstIndex, onJump }: AzRailProps) {
  const railRef = useRef<HTMLElement>(null);
  const [letterPx, setLetterPx] = useState(LETTER_MAX_PX);

  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rail = railRef.current;
      if (!rail) return;
      const top = Math.max(rail.getBoundingClientRect().top, RAIL_TOP_PX);
      const room = window.innerHeight - top - RAIL_BOTTOM_GAP_PX;
      const next = Math.max(
        LETTER_MIN_PX,
        Math.min(LETTER_MAX_PX, Math.floor(room / LETTERS.length))
      );
      setLetterPx((current) => (current === next ? current : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Box
      ref={railRef}
      component="nav"
      aria-label={label}
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        alignItems: "center",
        position: "sticky",
        top: RAIL_TOP_PX,
        alignSelf: "flex-start",
        width: 22,
        flexShrink: 0,
      }}
    >
      {LETTERS.map((letter) => {
        const index = firstIndex.get(letter);
        return (
          <ButtonBase
            key={letter}
            disabled={index === undefined}
            onClick={() => index !== undefined && onJump(index)}
            sx={{
              width: "100%",
              height: letterPx,
              lineHeight: `${letterPx}px`,
              fontSize: Math.min(11, Math.round(letterPx * 0.62)),
              fontWeight: 600,
              borderRadius: 1,
              color: "dct.text3",
              "&.Mui-disabled": { opacity: 0.35 },
              "&:hover": { color: "primary.main", bgcolor: "dct.accentSoft" },
            }}
          >
            {letter}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

export interface TableColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  align?: "left" | "right";
  // Hide on narrow screens to keep the table readable.
  hideBelow?: "sm" | "md" | "lg";
}

interface SelectionProps {
  selectable: boolean;
  isSelected: (id: number) => boolean;
  onToggle: (id: number) => void;
}

interface ItemTableProps<T> extends SelectionProps {
  items: T[];
  getKey: (item: T) => number;
  columns: TableColumn<T>[];
  // Leave out for a table without a thumbnail column.
  getPhoto?: (item: T) => string | null;
  onOpen: (item: T) => void;
}

const Thumb = ({ src, width, height }: { src: string | null; width: number; height: number }) => (
  <Box
    sx={{
      width,
      height,
      flexShrink: 0,
      borderRadius: 1,
      bgcolor: "dct.photoBg",
      overflow: "hidden",
      outline: 1,
      outlineStyle: "solid",
      outlineColor: "dct.border",
      outlineOffset: "-1px",
    }}
  >
    <PhotoImg src={src} iconSize={Math.round(height / 2)} />
  </Box>
);

// Dense table view: one row per item, every field in its own column.
export function ItemTable<T>({
  items,
  getKey,
  columns,
  getPhoto,
  onOpen,
  selectable,
  isSelected,
  onToggle,
}: ItemTableProps<T>) {
  const hide = (column: TableColumn<T>) =>
    column.hideBelow ? { display: { xs: "none", [column.hideBelow]: "table-cell" } } : undefined;
  return (
    <TableContainer
      sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            {selectable ? <TableCell padding="checkbox" /> : null}
            {getPhoto ? <TableCell sx={{ width: 60 }} /> : null}
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align}
                sx={{ whiteSpace: "nowrap", ...hide(column) }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const id = getKey(item);
            const selected = selectable && isSelected(id);
            return (
              <TableRow
                key={id}
                hover
                selected={selected}
                onClick={() => (selectable ? onToggle(id) : onOpen(item))}
                // Reachable and usable from the keyboard, like the cards.
                tabIndex={0}
                aria-selected={selectable ? selected : undefined}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  if (selectable) onToggle(id);
                  else onOpen(item);
                }}
                sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
              >
                {selectable ? (
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={selected} tabIndex={-1} />
                  </TableCell>
                ) : null}
                {getPhoto ? (
                  <TableCell>
                    <Thumb src={getPhoto(item)} width={44} height={33} />
                  </TableCell>
                ) : null}
                {columns.map((column, index) => (
                  <TableCell
                    key={column.key}
                    align={column.align}
                    sx={{
                      whiteSpace: "nowrap",
                      fontWeight: index === 0 ? 600 : undefined,
                      ...hide(column),
                    }}
                  >
                    {column.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export interface OverviewRow {
  title: string;
  subtitle: string;
  chips: string[];
  status: CarStatus;
  quantity: number;
}

interface OverviewRowsProps<T> extends SelectionProps {
  items: T[];
  getKey: (item: T) => number;
  getPhoto: (item: T) => string | null;
  getRow: (item: T) => OverviewRow;
  onOpen: (item: T) => void;
}

const CHIP_TONES = {
  owned: { border: "rgba(63,178,127,.45)", bg: "rgba(63,178,127,.12)", color: "dct.owned" },
  wishlist: { border: "rgba(255,107,139,.45)", bg: "rgba(255,107,139,.12)", color: "dct.wishlist" },
} as const;

const Chip = ({ children, tone }: { children: ReactNode; tone?: keyof typeof CHIP_TONES }) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      alignItems: "center",
      px: 1,
      height: 22,
      borderRadius: 2.75,
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: "nowrap",
      border: 1,
      borderColor: tone ? CHIP_TONES[tone].border : "dct.border",
      bgcolor: tone ? CHIP_TONES[tone].bg : "dct.surface2",
      color: tone ? CHIP_TONES[tone].color : "text.secondary",
    }}
  >
    {children}
  </Box>
);

// Overview: a bigger thumbnail with the item's key facts as chips beside it.
export function OverviewRows<T>({
  items,
  getKey,
  getPhoto,
  getRow,
  onOpen,
  selectable,
  isSelected,
  onToggle,
}: OverviewRowsProps<T>) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      {items.map((item) => {
        const id = getKey(item);
        const row = getRow(item);
        const selected = selectable && isSelected(id);
        return (
          <ButtonBase
            key={id}
            onClick={() => (selectable ? onToggle(id) : onOpen(item))}
            aria-pressed={selectable ? selected : undefined}
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              textAlign: "left",
              gap: 1.75,
              p: 1.25,
              borderBottom: 1,
              borderColor: "divider",
              "&:last-of-type": { borderBottom: 0 },
              bgcolor: selected ? "dct.accentSoft" : "transparent",
              "&:hover": { bgcolor: selected ? "dct.accentSoft" : "dct.surfaceHover" },
            }}
          >
            {selectable ? (
              <Checkbox size="small" checked={selected} tabIndex={-1} sx={{ p: 0.5 }} />
            ) : null}
            <Thumb src={getPhoto(item)} width={96} height={72} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {row.title}
              </Typography>
              <Typography variant="caption" component="div" noWrap sx={{ color: "dct.text3" }}>
                {row.subtitle}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.75 }}>
                {row.chips.map((chip) => (
                  <Chip key={chip}>{chip}</Chip>
                ))}
              </Box>
            </Box>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Chip tone={row.status}>
                {t(`status.${row.status}`)}
                {row.quantity > 1 ? ` ×${row.quantity}` : ""}
              </Chip>
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

// A plain responsive grid for the small browse lists (no virtualizing needed).
export const CardGrid = ({ size, children }: { size: number; children: ReactNode }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: {
        xs: "repeat(2, minmax(0, 1fr))",
        sm: `repeat(auto-fill, minmax(${size}px, 1fr))`,
      },
      gap: { xs: "14px 10px", sm: "18px 16px" },
    }}
  >
    {children}
  </Box>
);
