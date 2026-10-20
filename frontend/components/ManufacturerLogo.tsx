import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { manufacturerLogo } from "../utils/manufacturerLogos";

interface ManufacturerLogoProps {
  name: string;
  height: number;
}

// Brand logos sit on a fixed light plate in both themes: Matchbox's has a see-through center
// that would vanish on a dark card. Manufacturers without a bundled logo show their name.
const ManufacturerLogo = ({ name, height }: ManufacturerLogoProps) => {
  const logo = manufacturerLogo(name);
  return (
    <Box
      sx={{
        height,
        bgcolor: "#ffffff",
        color: "#1b2130",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        borderRadius: 1,
      }}
    >
      {logo ? (
        <Box
          component="img"
          src={logo}
          alt={name}
          sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      ) : (
        <Typography variant="h6" component="span" sx={{ textAlign: "center", fontWeight: 600 }}>
          {name}
        </Typography>
      )}
    </Box>
  );
};

export default ManufacturerLogo;
