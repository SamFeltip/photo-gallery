export const prerender = false;

import type { APIContext, APIRoute } from "astro";
import { getBlurhashFromBucket } from "~/lib/getBlurhash";

export const GET: APIRoute = async ({ locals, params }: APIContext) => {
  const id = params.id;

  if (!id) {
    return new Response("id doesn't exist", { status: 400 });
  }

  const { gallery_images } = locals.runtime.env;

  const cssgradient = await getBlurhashFromBucket(gallery_images, id);
  // const cssgradient = await getBlurhash(id);

  return new Response(cssgradient);
};
