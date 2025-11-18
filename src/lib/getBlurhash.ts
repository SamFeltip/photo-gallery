import { transform } from "unpic/providers/cloudflare";
import { blurhashToCssGradientString } from "@unpic/placeholder";
import { encode } from "blurhash";
import { getPixels } from "@unpic/pixels";

export async function getBlurhashFromBucket(
  bucket: R2Bucket,
  id: string
): Promise<string> {
  console.log("Generating blurhash for:", id);
  const object = await bucket.get(id);

  if (!object) {
    throw new Error("key is not present");
  }

  console.log("Fetched object from bucket:", id);

  const arrayBuffer = await object.arrayBuffer();
  const newArrayBuffer = new Uint8Array(arrayBuffer);

  const jpgData = await getPixels(newArrayBuffer);

  const data = Uint8ClampedArray.from(jpgData.data);
  const blurhash = encode(data, jpgData.width, jpgData.height, 4, 4);
  console.log("Generated blurhash:", blurhash);

  const cssgradient = blurhashToCssGradientString(blurhash);
  console.log("CSS Gradient generated!\n=======");

  return cssgradient;
}

export async function getBlurhash(src: string): Promise<string> {
  console.log("Generating blurhash for:", src);
  const transformedImg = transform("/images/" + src, {
    width: 100,
    quality: 70,
    format: "jpg",
  });
  console.log("Transformed image URL:", transformedImg);

  const imgData = await getPixels(
    "https://photos.samfelton.com" + transformedImg
  );

  const data = Uint8ClampedArray.from(imgData.data);
  const blurhash = encode(data, imgData.width, imgData.height, 4, 4);
  console.log("Generated blurhash:", blurhash);

  const cssgradient = blurhashToCssGradientString(blurhash);
  console.log("CSS Gradient generated!\n=======");

  return cssgradient;
}
