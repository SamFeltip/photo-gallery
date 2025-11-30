// src/pages/api/upload.ts
import { blurhashToCssGradientString } from "@unpic/placeholder";
import type { APIRoute } from "astro";
import { generateBlurhashFromArrayBuffer } from "~/lib/getBlurhash";

export type UploadResponseJson = {
  success: boolean;
  key?: string;
  error?: string;
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const formData = await request.formData();

    // 1. Extract Data
    const originalFile = formData.get("file") as File;
    const tinyFile = formData.get("tiny_file") as File; // The client-resized thumbnail
    const slug = formData.get("slug") as string;
    const group = formData.get("group") as string;
    const widthRaw = formData.get("width") as string;
    const heightRaw = formData.get("height") as string;

    // 2. Validation
    if (!originalFile || !slug) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing file or slug" }),
        { status: 400 }
      );
    }

    // 3. Generate Blurhash (Server Side)
    // Use the tiny file if provided (fast), otherwise fallback to original (slow)
    const fileForBlurhash = tinyFile || originalFile;
    const blurhashBuffer = await fileForBlurhash.arrayBuffer();

    const blurhash = await generateBlurhashFromArrayBuffer(blurhashBuffer);
    const cssgradient = blurhashToCssGradientString(blurhash);
    console.log("CSS Gradient generated!\n=======");

    // 4. Construct Filename
    let fileName = originalFile.name;
    if (group && group.trim() !== "") {
      const parts = fileName.split(".");
      const ext = parts.pop();
      const base = parts.join(".");
      // Inject group name: image.jpg -> image_details_.jpg
      fileName = `${base}_${group}_.${ext}`;
    }

    // Ensure slug doesn't have trailing slash, though usually fine
    const cleanSlug = slug.replace(/\/$/, "");
    const objectKey = `${cleanSlug}/${fileName}`;

    // 5. Get Bucket
    const env = locals.runtime.env as { gallery_images: R2Bucket };
    const bucket = env.gallery_images;

    if (!bucket) {
      console.error("Bucket binding 'gallery_images' not found");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500 }
      );
    }

    // 6. Upload to R2
    await bucket.put(objectKey, await originalFile.arrayBuffer(), {
      httpMetadata: {
        contentType: originalFile.type,
      },
      customMetadata: {
        width: widthRaw,
        height: heightRaw,
        blurhash: cssgradient,
      },
    });

    const res: UploadResponseJson = {
      success: true,
      key: objectKey,
    };

    // 7. Success Response
    return new Response(JSON.stringify(res), { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
