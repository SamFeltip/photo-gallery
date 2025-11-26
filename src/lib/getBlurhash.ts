import { transform } from "unpic/providers/cloudflare";
import { blurhashToCssGradientString } from "@unpic/placeholder";
import { encode } from "blurhash";
import { getPixels } from "@unpic/pixels";
import jpeg from "jpeg-js";

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
  console.log("Generating blurhash for****:", src);

  const val = await kvn.get(src);
  if (val) {
    return val;
  }

  const transformedImg = transform("/images/" + src, {
    width: 32,
    quality: 70,
    format: "jpg",
  });

  const remoteImgUrl = "https://photos.samfelton.com" + transformedImg;

  // returns a jpg
  const res = await fetch(remoteImgUrl);
  if (!res.ok) {
    console.error(
      `Failed to fetch image at ${remoteImgUrl}: ${res.statusText}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Decode JPEG → raw RGBA pixel data
  const decoded = jpeg.decode(uint8, { useTArray: true });

  const clamped = new Uint8ClampedArray(decoded.data.buffer);

  // // turn jpg into Uint8ClampedArray<ArrayBuffer>

  // console.log("remoteImgUrl: ", remoteImgUrl);
  // console.log({ remoteImgUrl });

  // const imgData = await getPixels(remoteImgUrl);

  // const clamped = Uint8ClampedArray.from(imgData.data);
  const blurhash = encode(clamped, decoded.width, decoded.height, 4, 4);
  console.log("Generated blurhash:", blurhash);

  const cssgradient = blurhashToCssGradientString(blurhash);
  console.log("CSS Gradient generated!\n=======");

  await kvn.put(src, cssgradient);

  return cssgradient;
}
