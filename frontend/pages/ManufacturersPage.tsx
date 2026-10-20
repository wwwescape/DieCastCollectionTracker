import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import CollectionSubNav from "../components/CollectionSubNav";
import ManufacturerLogo from "../components/ManufacturerLogo";
import { useManufacturerOverview } from "../hooks/useLookups";
import { useTranslation } from "react-i18next";

// Collection → Manufacturers: one card per manufacturer, most items first. Opening one shows
// all of its cars and sets.
const ManufacturersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: manufacturers, isLoading } = useManufacturerOverview();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("manufacturers.title")}
      </Typography>
      <CollectionSubNav />
      {isLoading ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("common.loading")}</Paper>
      ) : !manufacturers?.length ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>{t("manufacturers.none")}</Paper>
      ) : (
        <Grid container spacing={2}>
          {manufacturers.map((manufacturer) => (
            <Grid key={manufacturer.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card sx={{ height: "100%", borderRadius: 2, border: 1, borderColor: "divider" }}>
                <CardActionArea
                  onClick={() => navigate(`/collection/manufacturers/${manufacturer.id}`)}
                  sx={{ height: "100%", p: 1.5 }}
                >
                  <ManufacturerLogo name={manufacturer.name} height={110} />
                  <Typography variant="subtitle1" sx={{ mt: 1.5 }}>
                    {manufacturer.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("common.carCount", { count: manufacturer.carCount })} ·{" "}
                    {t("common.setCount", { count: manufacturer.setCount })}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ManufacturersPage;
