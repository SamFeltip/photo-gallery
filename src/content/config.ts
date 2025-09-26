// src/content/config.ts
import { defineCollection, reference, z } from "astro:content";
import { cldAssetsLoader } from "astro-cloudinary/loaders";

import { file } from "astro/loaders";

const cloudinaryImages = defineCollection({
  loader: cldAssetsLoader({
    // folder: "photo-gallery/devon",
    limit: 100,
  }),
});

const galleries = defineCollection({
  loader: file("src/content/galleries.json"),
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      name: z.string(),
      previewImg: z.string(),
      link: z.string(),
    }),
});

export const collections = {
  // galleryCollections: galleryCollections,
  galleries: galleries,
  cloudinaryImages: cloudinaryImages,
};
