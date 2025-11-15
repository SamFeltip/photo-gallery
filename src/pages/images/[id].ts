// export const prerender = false;

import type { APIContext, APIRoute } from "astro";

export const POST: APIRoute = async ({
  locals,
  params,
  request,
}: APIContext) => {
  console.log("hello world");
  const { MY_VARIABLE, gallery_images } = locals.runtime.env;
  const form = await request.formData();
  const file = form.get("file") as File | null;
  const name = form.get("name") as string | null;

  if (!name) {
    throw new Error("include name");
  }

  gallery_images.put(name, file);

  const items = await gallery_images.list();

  console.log(items);

  return new Response(JSON.stringify(items));
};

export const GET: APIRoute = async ({
  locals,
  params,
  request,
}: APIContext) => {
  //   const s = locals.runtime.env.gallery_images;
  const id = params.id;

  if (!id) {
    throw new Error("id doesn't exist");
  }

  const { MY_VARIABLE, gallery_images } = locals.runtime.env;

  const items = await gallery_images.list();
  console.log({ items });

  const s = await gallery_images.get(id);
  if (!s) {
    throw new Error("id is not present in bucket");
  }

  console.log({ s });

  return new Response(s.body, {
    headers: {
      "Content-Type": "image/png",
    },
  });
};
