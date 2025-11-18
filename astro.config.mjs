import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import path from "path";
import { imageService } from "@unpic/astro/service";
// import { imageService } from "unpic/providers/cloudflare";

import cloudflare from "@astrojs/cloudflare";

/**
 * {
      // placeholder: "blurhash",
      // layout: "constrained",
    }
 */

export default defineConfig({
  site: "https://photos.samfelton.com",
  output: "server",
  image: {
    service: imageService(),
    layout: "none",
  },
  build: {
    // assetsPrefix: "https://cdn.example.com",
    // assetsPrefix: {
    //   jpg: "https://photos.samfelton.com/cdn-cgi/image/",
    //   fallback: "https://photos.samfelton.com",
    // },
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: "wrangler.jsonc",
    },
    output: "server",
    // imageService: "compile",
    // imageService: "passthrough",
    // imageService: "custom",
    // imageService: "cloudflare",
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
