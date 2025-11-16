import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import path from "path";
import { imageService } from "@unpic/astro/service";

import cloudflare from "@astrojs/cloudflare";
import { transform } from "unpic/providers/cloudflare";

export default defineConfig({
  site: "https://photos.samfelton.com",
  output: "server",
  image: {
    service: imageService({
      placeholder: "blurhash",
      layout: "constrained",
    }),
  },
  build: {
    assetsPrefix: {
      jpg: "https://photos.samfelton.com/cdn-cgi/image/",
      fallback: "https://photos.samfelton.com",
    },
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: "wrangler.jsonc",
    },
    output: "server",
    imageService: "cloudflare",
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
