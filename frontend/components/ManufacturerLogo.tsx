import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { resolveAssetUrl } from "../api/client";
import { manufacturerLogo } from "../utils/manufacturerLogos";

interface ManufacturerLogoProps {
  name: string;
  height: number;
  // Uploaded in Settings → Lookups; wins over the bundled logo.
  logoUrl?: string | null;
}

// Brand logos sit on a fixed light plate in both themes: Matchbox's has a see-through center
// that would vanish on a dark card. An uploaded logo comes first, then the bundled one; without
// either (or if the uploaded file is gone, as after restoring a data-only backup) the name shows.
const ManufacturerLogo = ({ name, height, logoUrl }: ManufacturerLogoProps) => {
  const [failed, setFailed] = useState<string | null>(null);
  const uploaded = resolveAssetUrl(logoUrl ?? null);
  const logo = uploaded && failed !== uploaded ? uploaded : manufacturerLogo(name);
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
          onError={() => setFailed(logo)}
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
