import { useTranslation } from "react-i18next";
import { Section } from "../components/Detail";
import { EmptyState } from "../components/ListViews";
import Page from "../components/Page";
import {
  BarList,
  countBy,
  Panel,
  PanelGrid,
  StatTile,
  TileGrid,
  type BarRow,
} from "../components/Stats";
import { useCarList } from "../hooks/useCars";
import { useDashboard } from "../hooks/useDashboard";
import { useSetList } from "../hooks/useSets";
import { useCurrency } from "../theme/CurrencyProvider";
import { formatCurrency } from "../utils/currency";

const TOP = 10;

// Insights: the numbers behind the collection — headline totals and value, then breakdowns
// by status, condition, source, year, series, manufacturer and type. The Overview keeps only
// the headline figures; this is where to dig.
export default function InsightsPage() {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const { data: stats, isLoading } = useDashboard();
  const { data: cars = [] } = useCarList();
  const { data: sets = [] } = useSetList();

  const empty = t("insights.stats.noData");
  const other = t("insights.other");

  const byStatus = countBy(cars, (car) => t(`status.${car.status}`));
  const byCondition = countBy(
    cars.filter((car) => car.status === "owned"),
    (car) => (car.condition ? t(`conditions.${car.condition}`) : t("insights.notSet"))
  );
  const bySource = countBy([...cars, ...sets], (item) =>
    item.catalogTitle ? t("listToolbar.sourceWiki") : t("common.custom")
  );
  // Years read best in order, newest first, not by count.
  const byYear = countBy(cars, (car) => (car.year ? String(car.year) : null))
    .sort((a, b) => Number(b.label) - Number(a.label))
    .slice(0, TOP);

  const seriesRows: BarRow[] = countBy(cars, (car) => car.seriesName).map((row) => {
    const id = cars.find((car) => car.seriesName === row.label)?.seriesId;
    return { ...row, to: id ? `/collection/series/${id}` : undefined };
  });
  const manufacturerRows = countBy(cars, (car) => car.manufacturerName).map((row) => {
    const id = cars.find((car) => car.manufacturerName === row.label)?.manufacturerId;
    return { ...row, to: id ? `/collection/manufacturers/${id}` : undefined };
  });
  const byVehicleType = countBy(cars, (car) => car.vehicleTypeName);
  const bySetType = countBy(sets, (set) => t(`setTypes.${set.setType}`));

  return (
    <Page crumbs={[{ label: t("insights.title") }]}>
      {isLoading ? (
        <EmptyState>{t("common.loading")}</EmptyState>
      ) : stats ? (
        <TileGrid min={150}>
          <StatTile
            label={t("insights.stats.totalVehicles")}
            value={stats.totalCars}
            to="/collection/vehicles"
          />
          <StatTile label={t("insights.stats.piecesOwned")} value={stats.totalQuantity} />
          <StatTile label={t("insights.stats.owned")} value={stats.ownedCount} />
          <StatTile label={t("insights.stats.wishlist")} value={stats.wishlistCount} />
          <StatTile
            label={t("insights.stats.sets")}
            value={stats.totalSets}
            to="/collection/sets"
          />
          <StatTile label={t("insights.stats.setsOwned")} value={stats.setsOwned} />
          <StatTile
            label={t("insights.stats.collectionValue")}
            value={formatCurrency(stats.collectionValue, currency, { maximumFractionDigits: 0 })}
          />
        </TileGrid>
      ) : null}

      <Section title={t("insights.breakdowns")}>
        <PanelGrid>
          <Panel title={t("insights.byStatus")}>
            <BarList rows={byStatus} empty={empty} />
          </Panel>
          <Panel title={t("insights.byCondition")}>
            <BarList rows={byCondition} empty={empty} />
          </Panel>
          <Panel title={t("insights.bySource")}>
            <BarList rows={bySource} empty={empty} />
          </Panel>
          <Panel title={t("insights.byYear")}>
            <BarList rows={byYear} empty={empty} />
          </Panel>
          <Panel title={t("insights.topSeries")}>
            <BarList rows={seriesRows} empty={empty} limit={TOP} otherLabel={other} />
          </Panel>
          <Panel title={t("insights.stats.byManufacturer")}>
            <BarList rows={manufacturerRows} empty={empty} limit={TOP} otherLabel={other} />
          </Panel>
          <Panel title={t("insights.stats.byVehicleType")}>
            <BarList rows={byVehicleType} empty={empty} limit={TOP} otherLabel={other} />
          </Panel>
          <Panel title={t("insights.setsByType")}>
            <BarList rows={bySetType} empty={empty} />
          </Panel>
        </PanelGrid>
      </Section>
    </Page>
  );
}
