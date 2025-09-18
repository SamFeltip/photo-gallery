import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://photos.samfelton.com",
  output: "server",
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
    ssr: {
      noExternal: ["smartypants"],
    },
  },
});
