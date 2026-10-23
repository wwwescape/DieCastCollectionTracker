import { useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import { EmptyState } from "../components/ListViews";
import ManufacturerLogo from "../components/ManufacturerLogo";
import Page from "../components/Page";
import VehiclesAndSets from "../components/VehiclesAndSets";
import { useManufacturers } from "../hooks/useLookups";
import { useTranslation } from "react-i18next";

// Everything from one manufacturer: its cars, then its sets.
const ManufacturerPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const manufacturerId = Number(id);
  const { data: manufacturers, isLoading } = useManufacturers();
  const manufacturer = manufacturers?.find((m) => m.id === manufacturerId);
  const crumbs = [
    { label: t("nav.collection") },
    { label: t("manufacturers.title"), to: "/collection/manufacturers" },
  ];

  if (isLoading || !manufacturer) {
    return (
      <Page crumbs={crumbs}>
        <EmptyState>{isLoading ? t("common.loading") : t("manufacturers.notFound")}</EmptyState>
      </Page>
    );
  }

  return (
    <Page
      crumbs={[...crumbs, { label: manufacturer.name }]}
      actions={
        <Box sx={{ width: 180, bgcolor: "dct.photoBg", borderRadius: 1.5, p: 0.75 }}>
          <ManufacturerLogo name={manufacturer.name} height={48} />
        </Box>
      }
    >
      <VehiclesAndSets
        filter={{ manufacturerId }}
        noVehicles={t("manufacturers.noVehicles")}
        noSets={t("manufacturers.noSets")}
      />
    </Page>
  );
};

export default ManufacturerPage;
