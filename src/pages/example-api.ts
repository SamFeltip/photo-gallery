import type { APIRoute } from "astro";
import { getBlurhashFromBucket } from "~/lib/getBlurhash";

export const GET: APIRoute = async (context): Promise<Response> => {
  const bucket = context.locals.runtime.env.gallery_images;

  const blurhash = await getBlurhashFromBucket(
    bucket,
    // "surrey/0001_brockham_1.jpg"
    // "devon/WhatsApp_Image_2025-08-23_at_17_59_50_1_zq4nvv.jpg"
    "example/IMG_0883.jpeg"
  );

  //https://image-assets.samfelton.com/cdn-cgi/image/width=20/devon/WhatsApp_Image_2025-08-23_at_17_59_50_1_zq4nvv.jpg

  return new Response(
    JSON.stringify({
      blurhash,
    })
  );
};
