import { defineCollection, z } from "astro:content";

import { file } from "astro/loaders";
import { r2Loader } from "~/lib/r2Loader";

const galleryImages = z.object({
  key: z.string(),
  url: z.string().url(),
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
};
