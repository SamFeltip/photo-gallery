// src/content/config.ts
import { defineCollection, reference, z } from "astro:content";

const imagesCollections = import.meta.glob<{ default: ImageMetadata }>(
  "../images/collections/**/*.{jpg,jpeg,png,webp}"
);

const galleryImages = import.meta.glob<{ default: ImageMetadata }>(
  "../images/preview/**/*.{jpg,jpeg,png,webp}"
);

const imageZod = z.object({
  src: z.string(),
  width: z.number(),
  height: z.number(),
  format: z.enum(["jpg", "jpeg", "png", "webp"]),
  orientation: z.number().optional(),
});

const galleryCollections = defineCollection({
  schema: z.object({
    id: z.string(),
    collection: reference("galleries"),
    img: imageZod,
  }),
  loader: async () => {
    return Promise.all(
      Object.entries(imagesCollections).map(async ([path, image]) => {
        const { default: imageData } = await image();
        const galleryCollection = path
          .replace("../images/collections/", "")
          .replace(/\/[^/]+\.(jpg|jpeg|png|webp)/i, "");

        const id = path
          .replace(`../images/collections/${galleryCollection}/`, "")
          .replace(/\.(jpg|jpeg|png|webp)/i, "");

        return {
          id: id,
          collection: galleryCollection,
          img: imageData,
        };
      })
    );
  },
});

const galleries = defineCollection({
  schema: z.object({
    name: z.string(),
    previewImg: imageZod,
    link: z.string(),
  }),
  loader: async () => {
    return Promise.all(
      Object.entries(galleryImages).map(async ([path, image]) => {
        const { default: imageData } = await image();
        const match = path
          .replace("../images/preview/", "")
          .replace(/\/card.(jpg|jpeg|png|webp)/, "");

        return {
          id: match,
          name: match,
          link: `/${match}`,
          previewImg: imageData,
        };
      })
    );
  },
});

export const collections = {
  galleryCollections: galleryCollections,
  galleries: galleries,
};
