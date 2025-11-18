export const prerender = false;

import type { APIContext, APIRoute } from "astro";
export const GET: APIRoute = async ({ locals }: APIContext) => {
  console.log("hello world");
  const { gallery_images } = locals.runtime.env;
  console.log({ gallery_images });
  const items = await gallery_images.list();

  console.log({ items });

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({
  locals,
  params,
  request,
}: APIContext) => {
  console.log("hello world");
  const { gallery_images } = locals.runtime.env;
  const form = await request.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    throw new Error("include name");
  }

  console.log({ file });

  gallery_images.put(file.name, file);

  const items = await gallery_images.list();

  console.log({ items });

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
};
