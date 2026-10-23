import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Shared pieces for Overview and Insights: headline tiles, bordered panels and single-series
// bar lists (one hue — the accent — since every bar measures the same thing).

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  to?: string;
}

export const StatTile = ({ label, value, hint, icon, to }: StatTileProps) => (
  <Box
    {...(to ? { component: Link, to } : {})}
    sx={{
      display: "block",
      p: 2,
      bgcolor: "background.paper",
      border: 1,
      borderColor: "divider",
      borderRadius: 2,
      color: "inherit",
      textDecoration: "none",
      "&:hover": to ? { borderColor: "dct.borderStrong" } : undefined,
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        color: "dct.text3",
        "& svg": { fontSize: 18 },
      }}
    >
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
    <Typography
      sx={{ fontSize: 28, fontWeight: 650, letterSpacing: "-0.02em", lineHeight: 1.2, mt: 0.75 }}
    >
      {value}
    </Typography>
    {hint ? (
      <Typography variant="caption" component="div" sx={{ color: "dct.text3", mt: 0.25 }}>
        {hint}
      </Typography>
    ) : null}
  </Box>
);

export const TileGrid = ({ children, min = 170 }: { children: ReactNode; min?: number }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
      gap: 1.5,
    }}
  >
    {children}
  </Box>
);

interface PanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export const Panel = ({ title, action, children }: PanelProps) => (
  <Box
    sx={{
      bgcolor: "background.paper",
      border: 1,
      borderColor: "divider",
      borderRadius: 2,
      p: 2,
      minWidth: 0,
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        mb: 1.5,
      }}
    >
      <Typography variant="subtitle2" component="h2">
        {title}
      </Typography>
      {action}
    </Box>
    {children}
  </Box>
);

export const PanelGrid = ({ children, min = 320 }: { children: ReactNode; min?: number }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: `repeat(auto-fill, minmax(${min}px, 1fr))` },
      gap: 1.5,
      alignItems: "start",
    }}
  >
    {children}
  </Box>
);

export interface BarRow {
  label: string;
  value: number;
  to?: string;
}

interface BarListProps {
  rows: BarRow[];
  empty: string;
  // Show at most this many, largest first; the rest fold into one "Other" row.
  limit?: number;
  otherLabel?: string;
  format?: (value: number) => string;
}

export const BarList = ({
  rows,
  empty,
  limit,
  otherLabel = "Other",
  format = String,
}: BarListProps) => {
  if (!rows.length) {
    return (
      <Typography variant="body2" sx={{ color: "dct.text3" }}>
        {empty}
      </Typography>
    );
  }
  let shown = rows;
  if (limit && rows.length > limit) {
    const rest = rows.slice(limit - 1).reduce((total, row) => total + row.value, 0);
    shown = [...rows.slice(0, limit - 1), { label: otherLabel, value: rest }];
  }
  const max = Math.max(...shown.map((row) => row.value), 1);
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1 }}>
      {shown.map((row) => {
        const label = (
          <Box
            sx={{ display: "flex", justifyContent: "space-between", gap: 1, fontSize: 13, mb: 0.5 }}
          >
            <Box
              component="span"
              sx={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.label}
            </Box>
            <Box
              component="span"
              sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
            >
              {format(row.value)}
            </Box>
          </Box>
        );
        return (
          <Box
            component="li"
            key={row.label}
            title={`${row.label}: ${format(row.value)}`}
            sx={{ minWidth: 0 }}
          >
            <Box
              {...(row.to ? { component: Link, to: row.to } : {})}
              sx={{
                display: "block",
                color: "inherit",
                textDecoration: "none",
                borderRadius: 1,
                "&:hover .bar": row.to ? { opacity: 1 } : undefined,
              }}
            >
              {label}
              <Box sx={{ height: 6, borderRadius: 1, bgcolor: "dct.surface2" }}>
                <Box
                  className="bar"
                  sx={{
                    height: "100%",
                    width: `${Math.max((row.value / max) * 100, 2)}%`,
                    borderRadius: 1,
                    bgcolor: "primary.main",
                    opacity: 0.85,
                  }}
                />
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

// Count items by a key, largest first.
export function countBy<T>(
  items: T[],
  key: (item: T) => string | null | undefined,
  weight: (item: T) => number = () => 1
): BarRow[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + weight(item));
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}
