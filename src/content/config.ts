// src/content/config.ts
import { defineCollection, reference, z } from "astro:content";
import { cldAssetsLoader } from "astro-cloudinary/loaders";

import { file } from "astro/loaders";

// const imagesCollections = import.meta.glob<{ default: ImageMetadata }>(
//   "@/images/collections/**/*.{jpg,jpeg,png,webp}"
// );

// const galleryImages = import.meta.glob<{ default: ImageMetadata }>(
//   "@/images/preview/**/*.{jpg,jpeg,png,webp}"
// );

// const imageZod = z.object({
//   src: z.string(),
//   width: z.number(),
//   height: z.number(),
//   format: z.enum(["jpg", "jpeg", "png", "webp"]),
//   orientation: z.number().optional(),
// });

const cloudinaryImages = defineCollection({
  loader: cldAssetsLoader({
    folder: "photo-gallery/devon",
    limit: 100,
  }),
});

// const galleryCollections = defineCollection({
//   schema: ({ image }) =>
//     z.object({
//       id: z.string(),
//       collection: reference("galleries"),
//       img: imageZod,
//     }),
//   loader: async () => {
//     return Promise.all(
//       Object.entries(imagesCollections).map(async ([path, image]) => {
//         const { default: imageData } = await image();
//         const galleryCollection = path
//           .replace("@/images/collections/", "")
//           .replace(/\/[^/]+\.(jpg|jpeg|png|webp)/i, "");

//         const id = path
//           .replace(`@/images/collections/${galleryCollection}/`, "")
//           .replace(/\.(jpg|jpeg|png|webp)/i, "");

//         return {
//           id: id,
//           collection: galleryCollection,
//           img: imageData,
//         };
//       })
//     );
//   },
// });

// const galleries = defineCollection({
//   schema: ({ image }) =>
//     z.object({
//       name: z.string(),
//       previewImg: imageZod,
//       link: z.string(),
//     }),
//   loader: async () => {
//     return Promise.all(
//       Object.entries(galleryImages).map(async ([path, image]) => {
//         const { default: imageData } = await image();
//         const match = path
//           .replace("@/images/preview/", "")
//           .replace(/\/card.(jpg|jpeg|png|webp)/, "");

//         return {
//           id: match,
//           name: match,
//           link: `/${match}`,
//           previewImg: imageData,
//         };
//       })
//     );
//   },
// });

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
