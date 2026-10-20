import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { useTranslation } from "react-i18next";
import CollectionSubNav from "../components/CollectionSubNav";
import RoadIcon from "../icons/RoadIcon";

interface AddTileProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

// A big, primary-coloured button: the Collection page is a launch pad for adding things.
function AddTile({ icon, title, description, onClick }: AddTileProps) {
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 3,
        bgcolor: "primary.main",
        color: "primary.contrastText",
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: "100%", p: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <AddIcon sx={{ fontSize: 32 }} />
          <Box sx={{ display: "flex", "& svg": { fontSize: 40 } }}>{icon}</Box>
        </Box>
        <Typography variant="h5" component="span" sx={{ display: "block", fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
          {description}
        </Typography>
      </CardActionArea>
    </Card>
  );
}

// Collection: two ways in — add a vehicle or add a set. Browsing lives in the sub-nav
// (Vehicles, Sets, Manufacturers) and the numbers on the Insights page.
export default function CollectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("collection.title")}
      </Typography>
      <CollectionSubNav />
      <Grid container spacing={2} sx={{ maxWidth: 900 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <AddTile
            icon={<DirectionsCarIcon />}
            title={t("vehicles.addVehicle")}
            description={t("collection.addVehicleDescription")}
            onClick={() => navigate("/collection/vehicles/add")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <AddTile
            icon={<RoadIcon />}
            title={t("sets.addSet")}
            description={t("collection.addSetDescription")}
            onClick={() => navigate("/collection/sets/add")}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
