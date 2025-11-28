// src/content/config.ts
import { defineCollection, z } from "astro:content";
// import { cldAssetsLoader } from "astro-cloudinary/loaders";

import { file } from "astro/loaders";
import { r2Loader } from "~/lib/r2Loader";

const galleryImages = z.object({
  key: z.string(),
  url: z.string().url(),
  lastModified: z.date().optional(),
  width: z.number(),
  height: z.number(),
});

export type GalleryImage = z.infer<typeof galleryImages>;

// Define the schema for our R2 gallery items
const gallerySchema = z.object({
  display_name: z.string(),
  imageCount: z.number(),
  coverImage: z.string().nullable(),
  images: z.array(galleryImages),
});

const r2Images = defineCollection({
  // Use the custom loader
  loader: r2Loader({
    accountId: import.meta.env.R2_ACCOUNT_ID,
    bucket: import.meta.env.R2_BUCKET_NAME,
    accessKeyId: import.meta.env.R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.R2_SECRET_ACCESS_KEY,
    publicUrl: import.meta.env.R2_PUBLIC_URL,
  }),
  schema: gallerySchema,
});

const galleries = defineCollection({
  loader: file("src/content/galleries.json"),
  schema: () =>
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      previewImg: z.string(),
      link: z.string(),
      groups: z
        .array(
          z.object({
            name: z.string(),
            title: z.string().optional(),
            description: z.string().optional(),
          })
        )
        .default([]),
    }),
});

export const collections = {
  // galleryCollections: galleryCollections,
  galleries: galleries,
  r2Images: r2Images,
};
