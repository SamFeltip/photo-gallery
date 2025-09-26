import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import path from "path";
import { imageService } from "@unpic/astro/service";

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
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
    maxDuration: 8,
    imageService: true,
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
