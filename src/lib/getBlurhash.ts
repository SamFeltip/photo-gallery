import { transform } from "unpic/providers/cloudflare";
import { blurhashToCssGradientString } from "@unpic/placeholder";
import { encode } from "blurhash";
import { getPixels } from "@unpic/pixels";

export async function getBlurhash(src: string): Promise<string> {
  console.log("Generating blurhash for:", src);
  const transformedImg = transform(src, {
    width: 100,
    quality: 70,
    format: "png",
  });
  console.log("Transformed image URL:", transformedImg);

  const jpgData = await getPixels(
    "https://photos.samfelton.com" + transformedImg
  );

  const data = Uint8ClampedArray.from(jpgData.data);
  const blurhash = encode(data, jpgData.width, jpgData.height, 4, 4);
  console.log("Generated blurhash:", blurhash);

  const cssgradient = blurhashToCssGradientString(blurhash);
  console.log("CSS Gradient generated!\n=======");

  return cssgradient;
}
