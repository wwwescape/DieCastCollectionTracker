import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/EditOutlined";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PaletteIcon from "@mui/icons-material/PaletteOutlined";
import SellIcon from "@mui/icons-material/SellOutlined";
import TagIcon from "@mui/icons-material/Tag";
import VerifiedIcon from "@mui/icons-material/VerifiedOutlined";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "../api/client";
import ConfirmDialog from "../components/ConfirmDialog";
import { DetailHero, Facts, Pill, Section, Strip } from "../components/Detail";
import { EmptyState } from "../components/ListViews";
import Page, { ToolbarButton, ToolbarDivider } from "../components/Page";
import PhotoGallery from "../components/PhotoGallery";
import {
  useAddCarPhoto,
  useCar,
  useCarList,
  useDeleteCar,
  useDeleteCarPhoto,
  useSetCarPhotoPrimary,
} from "../hooks/useCars";
import { useCurrency } from "../theme/CurrencyProvider";
import { CATALOG_SOURCE_LABELS } from "../utils/catalog";
import { formatCurrency } from "../utils/currency";
import { useDetailBack } from "../utils/navState";
import { TOAST_OPTIONS } from "../utils/toastOptions";

const MORE_FROM_SERIES = 12;

// One vehicle: a photo hero with its key facts as pills, then details, notes,
// photos, more from the same series and the sets it's in. Editing lives one click away.
const VehiclePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { back, toList } = useDetailBack("/collection/vehicles");
  const { id } = useParams<{ id: string }>();
  const carId = Number(id);
  const { data: car, isLoading } = useCar(Number.isFinite(carId) ? carId : undefined);
  const { data: allCars } = useCarList();
  const { currency } = useCurrency();
  const deleteCar = useDeleteCar();
  const addPhoto = useAddCarPhoto(carId);
  const deletePhoto = useDeleteCarPhoto(carId);
  const setPrimaryPhoto = useSetCarPhotoPrimary(carId);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const listCrumbs = [
    { label: t("nav.collection") },
    { label: t("vehicles.title"), to: "/collection/vehicles" },
  ];

  if (isLoading || !car) {
    return (
      <Page crumbs={listCrumbs}>
        <EmptyState>{isLoading ? t("common.loading") : t("vehicles.notFound")}</EmptyState>
      </Page>
    );
  }

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await deleteCar.mutateAsync(carId);
      toast.success(t("vehicles.deleted", { name: car.name }), TOAST_OPTIONS);
      // Replace: Back mustn't return to the page of something that no longer exists.
      navigate("/collection/vehicles", { replace: true });
    } catch (error) {
      console.error("Error deleting car:", error);
      toast.error(t("vehicles.deleteError"), TOAST_OPTIONS);
    }
  };

  const photo = resolveAssetUrl(car.photo);
  const moreFromSeries = car.seriesId
    ? (allCars ?? [])
        .filter((other) => other.seriesId === car.seriesId && other.id !== car.id)
        .slice(0, MORE_FROM_SERIES)
    : [];

  return (
    <Page
      crumbs={[]}
      toolbar={
        <>
          <ToolbarButton
            icon={<ArrowBackIcon />}
            label={toList ? t("vehicles.title") : t("common.back")}
            onClick={back}
          />
          <ToolbarDivider />
          <ToolbarButton
            icon={<EditIcon />}
            label={t("detail.edit")}
            to={`/collection/vehicles/${car.id}/edit`}
            state={{ fromDetail: true }}
          />
          <ToolbarButton
            icon={<MenuBookIcon />}
            label={car.catalogTitle ? t("detail.rematch") : t("detail.match")}
            onClick={() =>
              navigate(`/collection/vehicles/${car.id}/edit`, {
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
          disabled={deleteCar.isPending}
          onClick={() => setConfirmDeleteOpen(true)}
        />
      }
      hero={
        <DetailHero
          photo={photo}
          crumbs={[...listCrumbs, { label: car.manufacturerName }]}
          title={car.name}
          subline={[car.manufacturerName, car.seriesName, car.year]}
          pills={
            <>
              <Pill
                icon={car.status === "owned" ? <CheckIcon /> : <FavoriteIcon />}
                tone={car.status === "owned" ? "owned" : "wishlist"}
              >
                {t(`status.${car.status}`)}
                {car.quantity > 1 ? ` ×${car.quantity}` : ""}
              </Pill>
              <Pill icon={<VerifiedIcon />}>
                {car.condition ? t(`conditions.${car.condition}`) : t("detail.conditionNotSet")}
              </Pill>
              {car.castNumber ? (
                <Pill icon={<TagIcon />}>{t("detail.toyNumber", { value: car.castNumber })}</Pill>
              ) : null}
              {car.collectionNumber ? (
                <Pill icon={<FormatListNumberedIcon />}>
                  {t("detail.collectionNumber", { value: car.collectionNumber })}
                </Pill>
              ) : null}
              {car.colorName ? <Pill icon={<PaletteIcon />}>{car.colorName}</Pill> : null}
              {car.vehicleTypeName ? (
                <Pill icon={<CategoryIcon />}>{car.vehicleTypeName}</Pill>
              ) : null}
              {car.catalogUrl && car.catalogSource ? (
                <Pill icon={<OpenInNewIcon />} tone="accent" href={car.catalogUrl}>
                  {CATALOG_SOURCE_LABELS[car.catalogSource]}
                </Pill>
              ) : car.catalogTitle ? null : (
                <Pill icon={<EditIcon />}>{t("common.custom")}</Pill>
              )}
              {car.tags.map((tag) => (
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
            [t("common.manufacturer"), car.manufacturerName],
            [t("vehicles.series"), car.seriesName],
            [t("common.year"), car.year],
            [t("vehicles.castNumber"), car.castNumber],
            [t("vehicles.collectionNumber"), car.collectionNumber],
            [t("common.color"), car.colorName],
            [t("vehicles.vehicleType"), car.vehicleTypeName],
            [t("common.quantity"), car.quantity],
            [
              t("common.purchasePrice"),
              car.purchasePrice !== null ? formatCurrency(car.purchasePrice, currency) : null,
            ],
            [t("detail.wikiCasting"), car.catalogTitle],
          ]}
        />
      </Section>
      {car.notes ? (
        <Section title={t("common.notes")}>
          <Typography sx={{ color: "text.secondary", whiteSpace: "pre-wrap", maxWidth: 900 }}>
            {car.notes}
          </Typography>
        </Section>
      ) : null}
      <PhotoGallery
        photos={car.photos}
        photoAlt={t("gallery.vehiclePhoto")}
        addPhoto={addPhoto}
        deletePhoto={deletePhoto}
        setPrimary={setPrimaryPhoto}
      />
      {moreFromSeries.length ? (
        <Section title={t("detail.moreFrom", { name: car.seriesName })}>
          <Strip
            items={moreFromSeries.map((other) => ({
              key: other.id,
              to: `/collection/vehicles/${other.id}`,
              photo: resolveAssetUrl(other.photo),
              title: other.name,
              subtitle: [
                other.year,
                other.colorName,
                other.status === "wishlist" ? t("status.wishlist") : null,
              ]
                .filter(Boolean)
                .join(" · "),
              owned: other.status === "owned",
            }))}
          />
        </Section>
      ) : null}
      <Section title={t("vehicles.linkedSets")}>
        {car.sets.length ? (
          <Strip
            items={car.sets.map((set) => ({
              key: set.id,
              to: `/collection/sets/${set.id}`,
              photo: resolveAssetUrl(set.photo),
              title: set.name,
              subtitle: [set.manufacturerName, set.year].filter(Boolean).join(" · "),
            }))}
          />
        ) : (
          <Typography sx={{ color: "dct.text3" }}>{t("detail.notInSets")}</Typography>
        )}
      </Section>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t("vehicles.deleteConfirmTitle")}
        description={t("vehicles.deleteConfirmDescription", { name: car.name })}
        confirmLabel={t("common.delete")}
        confirmColor="error"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </Page>
  );
};

export default VehiclePage;
