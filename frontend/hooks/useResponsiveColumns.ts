import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// DCT car cards: xs:12, sm:6, md:4, lg:3 → 1/2/3/4 columns
const COLUMNS_BY_BREAKPOINT = { xs: 1, sm: 2, md: 3, lg: 4, xl: 4 } as const;

export function useResponsiveColumns(): number {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));
  const isMd = useMediaQuery(theme.breakpoints.up("md"));
  const isLg = useMediaQuery(theme.breakpoints.up("lg"));
  const isXl = useMediaQuery(theme.breakpoints.up("xl"));

  if (isXl) return COLUMNS_BY_BREAKPOINT.xl;
  if (isLg) return COLUMNS_BY_BREAKPOINT.lg;
  if (isMd) return COLUMNS_BY_BREAKPOINT.md;
  if (isSm) return COLUMNS_BY_BREAKPOINT.sm;
  return COLUMNS_BY_BREAKPOINT.xs;
}
