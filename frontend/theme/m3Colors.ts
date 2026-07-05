import { argbFromHex, Hct, hexFromArgb, SchemeVibrant } from "@material/material-color-utilities";

// Racing red — distinctive for a die-cast tracker, evokes motorsport/track livery without
// matching any single manufacturer's brand color (Hot Wheels orange, Matchbox blue, etc.).
export const SEED_COLOR_HEX = "#E10600";

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

export function buildM3Scheme(mode: ColorMode, contrast: ContrastLevel, seedHex: string = SEED_COLOR_HEX): M3Scheme {
  const sourceHct = Hct.fromInt(argbFromHex(seedHex));
  const dynamicScheme = new SchemeVibrant(sourceHct, mode === "dark", CONTRAST_LEVEL_VALUE[contrast]);

  const scheme = {} as M3Scheme;
  for (const key of ROLE_KEYS) {
    // DynamicScheme exposes each role as a getter returning an ARGB int.
    const argb = (dynamicScheme as unknown as Record<string, number>)[key];
    scheme[key] = hexFromArgb(argb);
  }
  return scheme;
}
