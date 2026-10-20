// Logos bundled in public/manufacturers/, matched to a manufacturer by name (case and
// punctuation ignored). Anything else shows its name instead.
const LOGOS: Record<string, string> = {
  hotwheels: "/manufacturers/hot-wheels.png",
  matchbox: "/manufacturers/matchbox.png",
  majorette: "/manufacturers/majorette.png",
};

export function manufacturerLogo(name: string): string | null {
  return LOGOS[name.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null;
}
