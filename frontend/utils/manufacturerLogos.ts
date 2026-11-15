// Logos bundled in public/manufacturers/, matched to a manufacturer by name (case and
// punctuation ignored): only the two brands the wiki catalog covers. Every other manufacturer
// can have a logo uploaded in Settings → Lookups, or shows its name. Each is a PNG 800 px wide
// on a transparent background, cropped tight to the logo.
const LOGOS: Record<string, string> = {
  hotwheels: "/manufacturers/hot-wheels.png",
  matchbox: "/manufacturers/matchbox.png",
};

export function manufacturerLogo(name: string): string | null {
  return LOGOS[name.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null;
}
