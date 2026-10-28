import { Fragment, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AddCircleIcon from "@mui/icons-material/AddCircleOutline";
import TuneIcon from "@mui/icons-material/Tune";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "../api/client";
import CustomizeOverviewDialog from "../components/CustomizeOverviewDialog";
import { Section } from "../components/Detail";
import PagedStrip from "../components/PagedStrip";
import { EmptyState } from "../components/ListViews";
import Page, { ToolbarButton } from "../components/Page";
import { StatTile, TileGrid } from "../components/Stats";
import { useCarList } from "../hooks/useCars";
import { useDashboard } from "../hooks/useDashboard";
import { useOverviewLayout, type OverviewSectionKey } from "../hooks/useOverviewLayout";
import { useSetList } from "../hooks/useSets";
import { useCurrency } from "../theme/CurrencyProvider";
import { ATTENTION_CHECKS, ATTENTION_KINDS } from "../utils/attention";
import { formatCurrency } from "../utils/currency";
import { TOAST_OPTIONS } from "../utils/toastOptions";

const PREVIEW = 12;

// The home page: headline numbers, quick add, recently added, a wishlist preview and the gaps
// worth filling in, each linking to the filtered list. Deeper analysis lives on Insights.
// Customize hides and reorders the sections (saved on the account; see useOverviewLayout).
const OverviewPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const { data: cars = [] } = useCarList();
  const { data: sets = [] } = useSetList();
  const { data: stats } = useDashboard();
  const { layout, save } = useOverviewLayout();
  const [customizing, setCustomizing] = useState(false);

  const owned = cars.filter((car) => car.status === "owned");
  const pieces = owned.reduce((total, car) => total + car.quantity, 0);
  const wishlist = [...cars, ...sets].filter((item) => item.status === "wishlist");
  const series = new Set(cars.map((car) => car.seriesId).filter(Boolean)).size;

  const showWishlist = () => navigate("/collection/vehicles", { state: { wishlist: true } });

  const quickAdd = [
    { label: t("overview.addVehicle"), to: "/collection/vehicles/add" },
    { label: t("overview.addSet"), to: "/collection/sets/add" },
  ];

  const labels: Record<OverviewSectionKey, string> = {
    stats: t("overview.customize.stats"),
    quickAdd: t("overview.quickAdd"),
    recentlyAdded: t("insights.stats.recentlyAdded"),
    wishlist: t("overview.wishlist"),
    needsAttention: t("overview.needsAttention"),
  };
  const visible = layout.filter((section) => !section.hidden);

  const tiles = (
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
  );

  const sections: Record<OverviewSectionKey, ReactNode> = {
    // The tiles need no heading at the top of the page; anywhere else they get one.
    stats: visible[0]?.key === "stats" ? tiles : <Section title={labels.stats}>{tiles}</Section>,
    quickAdd: (
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
    ),
    recentlyAdded: stats?.recentlyAdded.length ? (
      <PagedStrip
        title={t("insights.stats.recentlyAdded")}
        items={stats.recentlyAdded.slice(0, PREVIEW).map((car) => ({
          key: car.id,
          to: `/collection/vehicles/${car.id}`,
          photo: resolveAssetUrl(car.photo),
          title: car.name,
          subtitle: [car.manufacturerName, car.year].filter(Boolean).join(" · "),
          status: car.status,
        }))}
      />
    ) : null,
    wishlist: wishlist.length ? (
      <PagedStrip
        title={t("overview.wishlist")}
        action={
          <ButtonBase
            onClick={showWishlist}
            sx={{ fontSize: 13, color: "primary.main", px: 1, borderRadius: 1 }}
          >
            {t("overview.viewAll")}
          </ButtonBase>
        }
        items={wishlist.slice(0, PREVIEW).map((item) => ({
          key: `${"setType" in item ? "s" : "v"}${item.id}`,
          to: `/collection/${"setType" in item ? "sets" : "vehicles"}/${item.id}`,
          photo: resolveAssetUrl(item.photo),
          title: item.name,
          subtitle: [item.manufacturerName, item.year].filter(Boolean).join(" · "),
          status: item.status,
        }))}
      />
    ) : null,
    needsAttention: (
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
    ),
  };

  const saveLayout = async (next: typeof layout) => {
    try {
      await save.mutateAsync(next);
      setCustomizing(false);
    } catch {
      toast.error(t("overview.customize.saveError"), TOAST_OPTIONS);
    }
  };

  return (
    <Page
      crumbs={[{ label: t("nav.overview") }]}
      toolbarEnd={
        <ToolbarButton
          icon={<TuneIcon />}
          label={t("overview.customize.button")}
          onClick={() => setCustomizing(true)}
        />
      }
    >
      {visible.map((section) => (
        <Fragment key={section.key}>{sections[section.key]}</Fragment>
      ))}
      {visible.length === 0 ? <EmptyState>{t("overview.customize.allHidden")}</EmptyState> : null}
      {customizing ? (
        <CustomizeOverviewDialog
          layout={layout}
          labels={labels}
          saving={save.isPending}
          onClose={() => setCustomizing(false)}
          onSave={(next) => void saveLayout(next)}
        />
      ) : null}
    </Page>
  );
};

export default OverviewPage;
