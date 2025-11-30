// @ts-check

import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import dotenv from "dotenv";
import { generateBlurhashFromArrayBuffer } from "~/lib/getBlurhash";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Load variables from .env
dotenv.config();

const {
  R2_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  IMAGES_FOLDER,
} = process.env;

if (!R2_ACCOUNT_ID) {
  throw new Error("Missing required environment variable R2_ACCOUNT_ID.");
}

if (!R2_BUCKET_NAME) {
  throw new Error("Missing required environment variable R2_BUCKET.");
}

if (!R2_ACCESS_KEY_ID) {
  throw new Error("Missing required environment variable R2_ACCESS_KEY.");
}

if (!R2_SECRET_ACCESS_KEY) {
  throw new Error("Missing required environment variable R2_SECRET_KEY.");
}

if (!IMAGES_FOLDER) {
  throw new Error("Missing required environment variable IMAGES_FOLDER.");
}

/**
 * @param {string} filename
 * @param {Buffer<ArrayBufferLike>} buffer
 * @param {*} metadata
 */
async function uploadToR2(
  filename: string,
  buffer: Buffer<ArrayBufferLike>,
  metadata = {}
) {
  console.log(
    `Uploading to R2 ${R2_BUCKET_NAME}/${filename} ... ${JSON.stringify(metadata)}`
  );

  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Missing R2 access keys.");
  }

  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const s3 = new S3Client({
    region: "auto",
    endpoint: url,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    // R2 requires path-style addressing
    forcePathStyle: true,
  });

  // 2. Prepare the UserMetadata
  // The S3 client handles the 'x-amz-meta-' prefix internally.
  // We filter out null/undefined values and ensure the keys/values are strings.
  const userMetadata: Record<string, string> = Object.fromEntries(
    Object.entries(metadata)
      .filter(([_k, v]) => v != null)
      .map(([k, v]) => [k, String(v)])
  );

  // 3. Create the PutObject Command
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename, // The key/path for the object
    Body: buffer, // The file content
    Metadata: userMetadata, // Custom metadata (the client prefixes keys with x-amz-meta-)
    ContentLength: buffer.length,
    // You might want to set other optional parameters like ContentType
    // ContentType: 'image/jpeg',
  });

  const response = await s3.send(command);
  console.log("Upload successful!", response, filename);
}

async function getAllImageFiles(
  dir: string,
  rootPath: string = dir
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  const files = await Promise.all(
    entries.map(async (entry) => {
      // Create the full path for the current entry
      const fullPath = path.join(dir, entry.name);

      // console.log({ fullPath }); // Useful for debugging

      if (entry.isDirectory()) {
        // Recurse, passing the original rootPath to the next call
        return getAllImageFiles(fullPath, rootPath);
      }

      // Only check if it's an image file
      if (/\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
        // Return the full absolute/relative path from the current directory
        return fullPath;
      }

      return null;
    })
  );

  // Flatten the array of arrays (from recursion) and filter out nulls
  const absoluteFiles = files.flat().filter(Boolean) as string[];

  // This block only executes for the initial call (where dir === rootPath)
  // or at the end of the recursion chain if we restructure slightly.
  // It's cleaner to only do the path conversion at the very end.
  if (dir === rootPath) {
    // Convert all found full paths to paths relative to the original root directory
    return absoluteFiles.map((file) => path.relative(rootPath, file));
  }

  // During recursion, just return the full paths up the chain
  return absoluteFiles;
}

async function processImages() {
  if (!IMAGES_FOLDER) {
    throw new Error("Missing required environment variable IMAGES_FOLDER.");
  }

  const filePaths = await getAllImageFiles(IMAGES_FOLDER);

  console.log(`Found ${filePaths.length} image files to process.`);
  for (const file of filePaths) {
    console.log(`Processing file: ${file}`);
    const filePath = path.join(IMAGES_FOLDER, file);

    if (!/\.(jpg|jpeg|png|webp)$/i.test(file)) continue;

    const image = sharp(filePath);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    const smallBuffer = await image.resize({ width: 100 }).toBuffer();

    const arrayBuffer = smallBuffer.buffer.slice(
      smallBuffer.byteOffset,
      smallBuffer.byteOffset + smallBuffer.byteLength
    );

    const blurhash = await generateBlurhashFromArrayBuffer(arrayBuffer);

    await uploadToR2(file, await fs.readFile(filePath), {
      width: width.toString(),
      height: height.toString(),
      blurhash,
    });
  }
}

processImages().catch(console.error);
