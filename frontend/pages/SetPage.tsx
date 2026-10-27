import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCarOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LockIcon from "@mui/icons-material/LockOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SellIcon from "@mui/icons-material/SellOutlined";
import TagIcon from "@mui/icons-material/Tag";
import VerifiedIcon from "@mui/icons-material/VerifiedOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "../api/client";
import ConfirmDialog from "../components/ConfirmDialog";
import { DetailHero, Facts, Pill, Section, Strip } from "../components/Detail";
import { EmptyState } from "../components/ListViews";
import Page, { ToolbarButton, ToolbarDivider } from "../components/Page";
import PhotoGallery from "../components/PhotoGallery";
import {
  useAddSetPhoto,
  useDeleteSet,
  useDeleteSetPhoto,
  useSet,
  useSetSetPhotoPrimary,
} from "../hooks/useSets";
import { useCurrency } from "../theme/CurrencyProvider";
import { CATALOG_SOURCE_LABELS } from "../utils/catalog";
import { formatCurrency } from "../utils/currency";
import { useDetailBack } from "../utils/navState";
import { TOAST_OPTIONS } from "../utils/toastOptions";

// One set: the same hero and sections as a vehicle, plus what came in the box (from the wiki)
// and the vehicles in the collection linked to it.
const SetPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { back, toList } = useDetailBack("/collection/sets");
  const { id } = useParams<{ id: string }>();
  const setId = Number(id);
  const { data: set, isLoading } = useSet(Number.isFinite(setId) ? setId : undefined);
  const { currency } = useCurrency();
  const deleteSet = useDeleteSet();
  const addPhoto = useAddSetPhoto(setId);
  const deletePhoto = useDeleteSetPhoto(setId);
  const setPrimaryPhoto = useSetSetPhotoPrimary(setId);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const listCrumbs = [
    { label: t("nav.collection") },
    { label: t("sets.title"), to: "/collection/sets" },
  ];

  if (isLoading || !set) {
    return (
      <Page crumbs={listCrumbs}>
        <EmptyState>{isLoading ? t("common.loading") : t("sets.notFound")}</EmptyState>
      </Page>
    );
  }

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await deleteSet.mutateAsync(setId);
      toast.success(t("sets.deleted", { name: set.name }), TOAST_OPTIONS);
      // Replace: Back mustn't return to the page of something that no longer exists.
      navigate("/collection/sets", { replace: true });
    } catch (error) {
      console.error("Error deleting set:", error);
      toast.error(t("sets.deleteError"), TOAST_OPTIONS);
    }
  };

  return (
    <Page
      crumbs={[]}
      toolbar={
        <>
          <ToolbarButton
            icon={<ArrowBackIcon />}
            label={toList ? t("sets.title") : t("common.back")}
            onClick={back}
          />
          <ToolbarDivider />
          <ToolbarButton
            icon={<EditIcon />}
            label={t("detail.edit")}
            to={`/collection/sets/${set.id}/edit`}
            state={{ fromDetail: true }}
          />
          <ToolbarButton
            icon={<MenuBookIcon />}
            label={set.catalogTitle ? t("detail.rematch") : t("detail.match")}
            onClick={() =>
              navigate(`/collection/sets/${set.id}/edit`, {
                state: { fromDetail: true, openMatch: true },
              })
            }
          />
        </>
      }
      toolbarEnd={
        <ToolbarButton
          icon={<DeleteIcon />}
          label={t("common.delete")}
          danger
          disabled={deleteSet.isPending}
          onClick={() => setConfirmDeleteOpen(true)}
        />
      }
      hero={
        <DetailHero
          photo={resolveAssetUrl(set.photo)}
          crumbs={[...listCrumbs, { label: set.manufacturerName }]}
          title={set.name}
          subline={[set.manufacturerName, set.seriesName, set.year]}
          pills={
            <>
              <Pill
                icon={set.status === "owned" ? <CheckIcon /> : <FavoriteIcon />}
                tone={set.status === "owned" ? "owned" : "wishlist"}
              >
                {t(`status.${set.status}`)}
                {set.quantity > 1 ? ` ×${set.quantity}` : ""}
              </Pill>
              <Pill icon={<CategoryIcon />}>{t(`setTypes.${set.setType}`)}</Pill>
              {set.status === "owned" ? (
                <Pill icon={<LockIcon />}>{set.sealed ? t("sets.sealed") : t("sets.opened")}</Pill>
              ) : null}
              {set.condition ? (
                <Pill icon={<VerifiedIcon />}>{t(`conditions.${set.condition}`)}</Pill>
              ) : null}
              {set.toyNumber ? (
                <Pill icon={<TagIcon />}>{t("detail.toyNumber", { value: set.toyNumber })}</Pill>
              ) : null}
              {set.contents.length ? (
                <Pill icon={<DirectionsCarIcon />}>
                  {t("common.vehicleCount", { count: set.contents.length })}
                </Pill>
              ) : null}
              {set.catalogUrl && set.catalogSource ? (
                <Pill icon={<OpenInNewIcon />} tone="accent" href={set.catalogUrl}>
                  {CATALOG_SOURCE_LABELS[set.catalogSource]}
                </Pill>
              ) : set.catalogTitle ? null : (
                <Pill icon={<EditIcon />}>{t("common.custom")}</Pill>
              )}
              {set.tags.map((tag) => (
                <Pill key={tag.id} icon={<SellIcon />}>
                  {tag.name}
                </Pill>
              ))}
            </>
          }
        />
      }
    >
      <Section title={t("detail.details")}>
        <Facts
          facts={[
            [t("common.manufacturer"), set.manufacturerName],
            [t("vehicles.series"), set.seriesName],
            [t("common.type"), t(`setTypes.${set.setType}`)],
            [t("common.year"), set.year],
            [t("sets.toyNumber"), set.toyNumber],
            [t("common.quantity"), set.quantity],
            [
              t("common.purchasePrice"),
              set.purchasePrice !== null ? formatCurrency(set.purchasePrice, currency) : null,
            ],
            [t("detail.wikiCasting"), set.catalogTitle],
          ]}
        />
      </Section>
      {set.notes ? (
        <Section title={t("common.notes")}>
          <Typography sx={{ color: "text.secondary", whiteSpace: "pre-wrap", maxWidth: 900 }}>
            {set.notes}
          </Typography>
        </Section>
      ) : null}
      {set.contents.length ? (
        <Section title={t("sets.vehiclesIncluded")}>
          <Box
            component="ol"
            sx={{ m: 0, pl: 2.5, columns: { sm: 2, lg: 3 }, color: "text.secondary" }}
          >
            {set.contents.map((item, index) => (
              <Box component="li" key={index} sx={{ py: 0.25, breakInside: "avoid" }}>
                {item}
              </Box>
            ))}
          </Box>
        </Section>
      ) : null}
      <PhotoGallery
        photos={set.photos}
        photoAlt={t("gallery.setPhoto")}
        addPhoto={addPhoto}
        deletePhoto={deletePhoto}
        setPrimary={setPrimaryPhoto}
      />
      <Section title={t("sets.linkedVehicles")}>
        {set.vehicles.length ? (
          <Strip
            items={set.vehicles.map((car) => ({
              key: car.id,
              to: `/collection/vehicles/${car.id}`,
              photo: resolveAssetUrl(car.photo),
              title: car.name,
              subtitle: [car.manufacturerName, car.year].filter(Boolean).join(" · "),
            }))}
          />
        ) : (
          <Typography sx={{ color: "dct.text3" }}>{t("detail.noLinkedVehicles")}</Typography>
        )}
      </Section>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t("sets.deleteConfirmTitle")}
        description={t("sets.deleteConfirmDescription", { name: set.name })}
        confirmLabel={t("common.delete")}
        confirmColor="error"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </Page>
  );
};

export default SetPage;
