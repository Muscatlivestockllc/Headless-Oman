import { defineConfig } from "vite";
import { hydrogen } from "@shopify/hydrogen/vite";
import { oxygen } from "@shopify/mini-oxygen/vite";
import { reactRouter } from "@react-router/dev/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { createRequire } from "module";
import { Module } from "module";
import fs from "fs";

// ─── Vite 6 / @react-router/dev JSON-parse bug workaround ────────────────────
// Vite 6's module runner converts JSON files (node-releases, caniuse-lite) to
// `var envs_data = [...]` JS via esbuild. Node.js's built-in .json loader then
// tries to JSON.parse that JS string and throws a SyntaxError, which crashes
// the react-router:react-refresh-babel Babel plugin and returns HTTP 500 for
// every client route module — so the page renders but JS never hydrates.
//
// Fix: patch Module._extensions['.json'] to recover from that specific failure
// by re-reading the file from disk (bypassing any Vite caching) and parsing
// the raw content instead.
const _require = createRequire(import.meta.url);
const origJsonLoader = (Module as any)._extensions[".json"];
(Module as any)._extensions[".json"] = function (mod: any, filename: string) {
  try {
    origJsonLoader(mod, filename);
  } catch (e: any) {
    if (e instanceof SyntaxError) {
      // Re-read directly from disk, bypassing Vite's intercepted require
      const raw = fs.readFileSync(filename, "utf8");
      try {
        mod.exports = JSON.parse(raw);
      } catch {
        throw e; // not a JSON file we can fix — rethrow original error
      }
    } else {
      throw e;
    }
  }
};

// Also pre-load the full Babel chain so all modules are in the CJS cache
// before Vite sets up its transform pipeline.
_require("@babel/core");

export default defineConfig({
  plugins: [
    hydrogen(),
    oxygen(),
    reactRouter(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  ssr: {
    external: ["browserslist", "node-releases", "caniuse-lite"],
    optimizeDeps: {
      include: [
        "react-dom/server.browser",
        "class-variance-authority",
        "cmdk",
        "sonner",
        "framer-motion",
        "date-fns",
        "input-otp",
        "embla-carousel-react",
        "recharts",
        "vaul",
        "@radix-ui/react-accordion",
        "@radix-ui/react-alert-dialog",
        "@radix-ui/react-aspect-ratio",
        "@radix-ui/react-avatar",
        "@radix-ui/react-checkbox",
        "@radix-ui/react-collapsible",
        "@radix-ui/react-context-menu",
        "@radix-ui/react-dialog",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-hover-card",
        "@radix-ui/react-label",
        "@radix-ui/react-menubar",
        "@radix-ui/react-navigation-menu",
        "@radix-ui/react-popover",
        "@radix-ui/react-progress",
        "@radix-ui/react-radio-group",
        "@radix-ui/react-scroll-area",
        "@radix-ui/react-select",
        "@radix-ui/react-separator",
        "@radix-ui/react-slider",
        "@radix-ui/react-slot",
        "@radix-ui/react-switch",
        "@radix-ui/react-tabs",
        "@radix-ui/react-toggle",
        "@radix-ui/react-toggle-group",
        "@radix-ui/react-tooltip",
        "react-hook-form",
        "zod",
        "@hookform/resolvers",
        "lucide-react",
      ],
    },
  },
});
