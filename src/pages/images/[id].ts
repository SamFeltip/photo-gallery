export const prerender = false;

import type { APIContext, APIRoute } from "astro";

export const GET: APIRoute = async ({ locals, params }: APIContext) => {
  const id = params.id;

  if (!id) {
    return new Response("id doesn't exist", { status: 400 });
  }

  const { gallery_images } = locals.runtime.env;

  const object = await gallery_images.get(id);

  if (!object) {
    return new Response("key is not present", { status: 404 });
  }

  if (!object.body) {
    console.error("image missing body", id);
    return new Response("image missing body", { status: 500 });
  }

  return new Response(object.body, {
    headers: { "Content-Type": object.httpMetadata?.contentType ?? "" },
  });
};
