// src/content/config.ts
import { defineCollection, reference, z } from "astro:content";
// import { cldAssetsLoader } from "astro-cloudinary/loaders";

import { file } from "astro/loaders";

// const cloudinaryImages = defineCollection({
//   loader: cldAssetsLoader({
//     // folder: "photo-gallery/devon",
//     limit: 100,
//   }),
// });

// const jpgData = await getPixels(gallery.data.previewImg);
// const data = Uint8ClampedArray.from(jpgData.data);
// const blurhash = encode(data, jpgData.width, jpgData.height, 4, 4);

// const placeholder = blurhashToCssGradientString(blurhash);

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
  // cloudinaryImages: cloudinaryImages,
};
