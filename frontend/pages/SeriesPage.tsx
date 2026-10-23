import { useParams, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/ListViews";
import Page from "../components/Page";
import VehiclesAndSets from "../components/VehiclesAndSets";
import { useSeriesOverview } from "../hooks/useLookups";
import { useTranslation } from "react-i18next";
import { seriesSubtitle } from "../utils/series";

// Everything in one year of a series: its vehicles, then its sets. Without ?year (a link from
// before series were split by year) it shows every year.
const SeriesPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const seriesId = Number(id);
  const yearParam = searchParams.get("year");
  const year = yearParam === null ? undefined : yearParam === "none" ? null : Number(yearParam);
  const { data: allSeries, isLoading } = useSeriesOverview();
  const series = allSeries?.find(
    (s) => s.id === seriesId && (year === undefined || s.year === year)
  );
  const crumbs = [
    { label: t("nav.collection") },
    { label: t("seriesPage.title"), to: "/collection/series" },
  ];

  if (isLoading || !series) {
    return (
      <Page crumbs={crumbs}>
        <EmptyState>{isLoading ? t("common.loading") : t("seriesPage.notFound")}</EmptyState>
      </Page>
    );
  }

  return (
    <Page
      crumbs={[...crumbs, { label: series.name }]}
      meta={
        seriesSubtitle({ manufacturerName: series.manufacturerName, year: year ?? null }) || null
      }
    >
      <VehiclesAndSets
        filter={{ seriesId }}
        year={year}
        noVehicles={t("seriesPage.noVehicles")}
        noSets={t("seriesPage.noSets")}
      />
    </Page>
  );
};

export default SeriesPage;
