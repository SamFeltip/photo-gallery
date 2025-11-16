import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import path from "path";
import { imageService } from "@unpic/astro/service";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://photos.samfelton.com",
  output: "server",
  image: {
    domains: ["res.cloudinary.com"],
    layout: "constrained",
    service: imageService({
      fallbackService: "cloudinary",
      placeholder: "blurhash",
      layout: "constrained",
    }),
  },
  adapter: cloudflare({
    runtime: { mode: "local" },
    platformProxy: {
      enabled: true,
      configPath: "wrangler.jsonc",
    },
    output: "server",
    imageService: "passthrough",
  }),
  devToolbar: {
    enabled: false,
  },
  integrations: [sitemap()],
  prefetch: true,
  vite: {
    resolve: {
      alias: {
        "@": path.resolve("./src"),
      },
    },
    ssr: {
      noExternal: ["smartypants"],
    },
  },
});
