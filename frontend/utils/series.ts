import type { SeriesOverview } from "../api/lookups";

// A series card opens one year of it: ?year=2024, or ?year=none for items without a year.
export const seriesPath = (series: Pick<SeriesOverview, "id" | "year">) =>
  `/collection/series/${series.id}?year=${series.year ?? "none"}`;

export const seriesSubtitle = (series: Pick<SeriesOverview, "manufacturerName" | "year">) =>
  [series.manufacturerName, series.year].filter(Boolean).join(" · ");
