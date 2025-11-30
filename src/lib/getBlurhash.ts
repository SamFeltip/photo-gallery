import { transform } from "unpic/providers/cloudflare";
import { blurhashToCssGradientString } from "@unpic/placeholder";
import { encode } from "blurhash";
import { getPixels } from "@unpic/pixels";
import jpeg from "jpeg-js";

export async function getBlurhashFromBucket(
  bucket: R2Bucket,
  id: string
): Promise<string> {
  const object = await bucket.get(id);

  if (!object) {
    throw new Error("key is not present");
  }

  console.log("Fetched object from bucket:", id);

  const arrayBuffer = await object.arrayBuffer();
  const blurhash = await generateBlurhashFromArrayBuffer(arrayBuffer);

  const cssgradient = blurhashToCssGradientString(blurhash);
  console.log("CSS Gradient generated!\n=======");

  return cssgradient;
}

export const generateBlurhashFromArrayBuffer = async (
  arrayBuffer: ArrayBufferLike
): Promise<string> => {
  const newArrayBuffer = new Uint8Array(arrayBuffer);

  const jpgData = await getPixels(newArrayBuffer);

  const data = Uint8ClampedArray.from(jpgData.data);
  const blurhash = encode(data, jpgData.width, jpgData.height, 4, 4);
  console.log("Generated blurhash:", blurhash);

  return blurhash;
};

/**
 *
 * @param kvn key value storage for css gradient blurhashes.
 * @param src image source.
 * @returns css gradient blurhash.
 */
export async function getBlurhash(
  kvn: KVNamespace<string>,
  src: string
): Promise<string> {
  const val = await kvn.get(src);
  if (val) {
    return val;
  }

  const transformedImg = transform(src, {
    width: 32,
    quality: 70,
    format: "jpg",
  });

  const remoteImgUrl = "https://image-assets.samfelton.com" + transformedImg;

  // returns a small jpg
  const res = await fetch(remoteImgUrl);
  if (!res.ok) {
    console.error("Status:", res.status);
    console.error("Headers:", [...res.headers]);
    const text = await res.text();
    console.error(text);

    console.error(`Failed to fetch image at ${src}: ${res.statusText}`);
    throw new Error(`Failed to fetch image at ${src}: ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  const cssgradient = generateBlurhashFromJpeg(uint8);
  await kvn.put(src, cssgradient);

  return cssgradient;
}

function generateBlurhashFromJpeg(uint8: Uint8Array): string {
  // Decode JPEG → raw RGBA pixel data
  const decoded = jpeg.decode(uint8, { useTArray: true });

  const clamped = new Uint8ClampedArray(decoded.data.buffer);

  const blurhash = encode(clamped, decoded.width, decoded.height, 4, 4);

  return blurhashToCssGradientString(blurhash);
}
