import { argbFromHex, Hct, hexFromArgb, SchemeVibrant } from "@material/material-color-utilities";

// The blue of the blister card in the app's logo (the middle of its gradient). Every other
// accent (Settings → Display) is used purely as a seed, as in VideoGameTrackarr.
export const SEED_COLOR_HEX = "#1F67D8";

export type ColorMode = "light" | "dark";
export type ContrastLevel = "normal" | "high";

export interface M3Scheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  shadow: string;
  scrim: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
}

const ROLE_KEYS: (keyof M3Scheme)[] = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "background",
  "onBackground",
  "surface",
  "onSurface",
  "surfaceVariant",
  "onSurfaceVariant",
  "outline",
  "outlineVariant",
  "shadow",
  "scrim",
  "inverseSurface",
  "inverseOnSurface",
  "inversePrimary",
];

const CONTRAST_LEVEL_VALUE: Record<ContrastLevel, number> = {
  normal: 0,
  high: 1,
};

export function buildM3Scheme(
  mode: ColorMode,
  contrast: ContrastLevel,
  seedHex: string = SEED_COLOR_HEX
): M3Scheme {
  const sourceHct = Hct.fromInt(argbFromHex(seedHex));
  const dynamicScheme = new SchemeVibrant(
    sourceHct,
    mode === "dark",
    CONTRAST_LEVEL_VALUE[contrast]
  );

  const scheme = {} as M3Scheme;
  for (const key of ROLE_KEYS) {
    // DynamicScheme exposes each role as a getter returning an ARGB int.
    const argb = (dynamicScheme as unknown as Record<string, number>)[key];
    scheme[key] = hexFromArgb(argb);
  }
  // M3 always puts light-mode primary at tone 40, which turns the logo blue into a darker
  // #0059c7. With the default accent, light mode uses the logo's exact blue instead (5.5:1
  // against white, so onPrimary text stays AA). Dark and high-contrast keep the M3 tones.
  if (
    mode === "light" &&
    contrast === "normal" &&
    seedHex.toLowerCase() === SEED_COLOR_HEX.toLowerCase()
  ) {
    scheme.primary = SEED_COLOR_HEX;
  }
  return scheme;
}
