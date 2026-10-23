import { useNavigate } from "react-router-dom";
import AddCircleIcon from "@mui/icons-material/AddCircleOutline";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "../api/client";
import { Section, Strip } from "../components/Detail";
import Page from "../components/Page";
import { StatTile, TileGrid } from "../components/Stats";
import { useCarList } from "../hooks/useCars";
import { useDashboard } from "../hooks/useDashboard";
import { useSetList } from "../hooks/useSets";
import { useCurrency } from "../theme/CurrencyProvider";
import { ATTENTION_CHECKS, ATTENTION_KINDS } from "../utils/attention";
import { formatCurrency } from "../utils/currency";

const PREVIEW = 12;

// The home page: headline numbers, quick add, recently added, a wishlist preview and the gaps
// worth filling in, each linking to the filtered list. Deeper analysis lives on Insights.
const OverviewPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const { data: cars = [] } = useCarList();
  const { data: sets = [] } = useSetList();
  const { data: stats } = useDashboard();

  const owned = cars.filter((car) => car.status === "owned");
  const pieces = owned.reduce((total, car) => total + car.quantity, 0);
  const wishlist = [...cars, ...sets].filter((item) => item.status === "wishlist");
  const series = new Set(cars.map((car) => car.seriesId).filter(Boolean)).size;

  const showWishlist = () => navigate("/collection/vehicles", { state: { wishlist: true } });

  const quickAdd = [
    { label: t("overview.addVehicle"), to: "/collection/vehicles/add" },
    { label: t("overview.addSet"), to: "/collection/sets/add" },
  ];

  return (
    <Page crumbs={[{ label: t("nav.overview") }]}>
      <TileGrid>
        <StatTile
          label={t("nav.vehicles")}
          value={cars.length}
          hint={t("overview.pieces", { count: pieces })}
          to="/collection/vehicles"
        />
        <StatTile label={t("nav.sets")} value={sets.length} to="/collection/sets" />
        <StatTile label={t("status.wishlist")} value={wishlist.length} />
        <StatTile label={t("nav.series")} value={series} to="/collection/series" />
        <StatTile
          label={t("insights.stats.collectionValue")}
          value={
            stats
              ? formatCurrency(stats.collectionValue, currency, { maximumFractionDigits: 0 })
              : "–"
          }
          to="/insights"
        />
      </TileGrid>

      <Section title={t("overview.quickAdd")}>
        <TileGrid min={200}>
          {quickAdd.map((item) => (
            <ButtonBase
              key={item.label}
              onClick={() => navigate(item.to)}
              sx={{
                justifyContent: "flex-start",
                gap: 1.25,
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                fontWeight: 600,
                color: "primary.main",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              <AddCircleIcon />
              {item.label}
            </ButtonBase>
          ))}
        </TileGrid>
      </Section>

      {stats?.recentlyAdded.length ? (
        <Section title={t("insights.stats.recentlyAdded")}>
          <Strip
            items={stats.recentlyAdded.slice(0, PREVIEW).map((car) => ({
              key: car.id,
              to: `/collection/vehicles/${car.id}`,
              photo: resolveAssetUrl(car.photo),
              title: car.name,
              subtitle: [car.manufacturerName, car.year].filter(Boolean).join(" · "),
            }))}
          />
        </Section>
      ) : null}

      {wishlist.length ? (
        <Section
          title={t("overview.wishlist")}
          action={
            <ButtonBase
              onClick={showWishlist}
              sx={{ fontSize: 13, color: "primary.main", px: 1, borderRadius: 1 }}
            >
              {t("overview.viewAll")}
            </ButtonBase>
          }
        >
          <Strip
            items={wishlist.slice(0, PREVIEW).map((item) => ({
              key: `${"setType" in item ? "s" : "v"}${item.id}`,
              to: `/collection/${"setType" in item ? "sets" : "vehicles"}/${item.id}`,
              photo: resolveAssetUrl(item.photo),
              title: item.name,
              subtitle: [item.manufacturerName, item.year].filter(Boolean).join(" · "),
            }))}
          />
        </Section>
      ) : null}

      <Section title={t("overview.needsAttention")}>
        <TileGrid>
          {ATTENTION_KINDS.map((kind) => (
            <Box
              key={kind}
              component={ButtonBase}
              onClick={() => navigate("/collection/vehicles", { state: { attention: kind } })}
              sx={{ display: "block", textAlign: "left", width: "100%" }}
            >
              <StatTile
                label={t(`overview.attention.${kind}`)}
                value={cars.filter(ATTENTION_CHECKS[kind]).length}
              />
            </Box>
          ))}
        </TileGrid>
      </Section>
    </Page>
  );
};

export default OverviewPage;
