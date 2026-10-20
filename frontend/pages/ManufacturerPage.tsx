import { useNavigate, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ManufacturerLogo from "../components/ManufacturerLogo";
import VehiclesAndSets from "../components/VehiclesAndSets";
import { useManufacturers } from "../hooks/useLookups";
import { useTranslation } from "react-i18next";

// Everything from one manufacturer: its cars, then its sets.
const ManufacturerPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const manufacturerId = Number(id);
  const { data: manufacturers, isLoading: manufacturersLoading } = useManufacturers();
  const manufacturer = manufacturers?.find((m) => m.id === manufacturerId);

  const back = (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/collection/manufacturers")}>
        {t("manufacturers.all")}
      </Button>
    </div>
  );

  if (manufacturersLoading) {
    return <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>;
  }
  if (!manufacturer) {
    return (
      <Stack spacing={2}>
        {back}
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("manufacturers.notFound")}</Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {back}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" } }}
      >
        <Box sx={{ width: { xs: "100%", sm: 260 }, flexShrink: 0 }}>
          <ManufacturerLogo name={manufacturer.name} height={100} />
        </Box>
        <Typography variant="h4" component="h1">
          {manufacturer.name}
        </Typography>
      </Stack>

      <VehiclesAndSets
        filter={{ manufacturerId }}
        noVehicles={t("manufacturers.noVehicles")}
        noSets={t("manufacturers.noSets")}
      />
    </Stack>
  );
};

export default ManufacturerPage;
