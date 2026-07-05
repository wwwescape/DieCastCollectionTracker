import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Node 22+'s own global localStorage/sessionStorage (see --experimental-webstorage) takes
// precedence over jsdom's window.localStorage unless disabled — without
// NODE_OPTIONS=--no-experimental-webstorage (set in package.json's test scripts), bare
// `localStorage` reads in app code resolve to Node's stub instead of jsdom's, breaking
// anything that touches it (tokenStorage.ts, etc.) with "ReferenceError: window is not
// defined" or silently-undefined values.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    css: false,
    // @mui/material's Dialog/Transition imports react-transition-group via a legacy
    // "fake subdirectory" package.json (main/module fields, no exports map) - Vite's
    // resolver understands that pattern, but Node's native ESM loader (what Vitest uses
    // for modules it treats as "external") doesn't. Since the failing import happens
    // *inside* an un-inlined @mui/material file, inlining react-transition-group alone
    // isn't enough — @mui itself needs to go through Vite's resolver too.
    server: {
      deps: {
        inline: [/@mui\//, "react-transition-group", /@material\//],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "test/**"],
    },
  },
});
