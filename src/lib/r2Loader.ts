import {
  ListObjectsV2Command,
  S3Client,
  type _Object,
} from "@aws-sdk/client-s3";
import type { Loader } from "astro/loaders";
import { probeImageSize } from "./imageProbe";

interface R2LoaderOptions {
  /** The Cloudflare Account ID (found in R2 dashboard) */
  accountId: string;
  /** The name of your R2 bucket */
  bucket: string;
  /** Access Key ID (create an API Token with Read permissions) */
  accessKeyId: string;
  /** Secret Access Key */
  secretAccessKey: string;
  /** Optional public domain for your bucket (e.g., https://pub-xxx.r2.dev). If not provided, you must handle the full URL manually. */
  publicUrl?: string;
  /** Optional prefix to filter/limit the search to a specific subfolder in the bucket */
  prefix?: string;
}

interface GalleryImage {
  key: string;
  url: string;
  lastModified?: Date;
  width: number;
  height: number;
}

export function r2Loader({
  accountId,
  bucket,
  accessKeyId,
  secretAccessKey,
  publicUrl,
  prefix = "",
}: R2LoaderOptions): Loader {
  return {
    name: "r2-bucket-loader",
    load: async ({ store, logger }) => {
      logger.info(`Fetching contents from R2 bucket: ${bucket}`);

      const client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      // Fetch all objects (handling pagination if necessary)
      let allObjects: _Object[] = [];
      let isTruncated = true;
      let continuationToken: string | undefined = undefined;

      try {
        while (isTruncated) {
          const command: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          });

          const response = await client.send(command);
          if (response.Contents) {
            allObjects.push(...response.Contents);
          }
          isTruncated = response.IsTruncated ?? false;
          continuationToken = response.NextContinuationToken;
        }
      } catch (error) {
        logger.error(`Failed to list R2 objects: ${(error as Error).message}`);
        return;
      }

      // Group files by folder
      // Structure: "folderName/image.jpg" -> entry ID: "folderName"
      const groups = new Map<string, GalleryImage[]>();

      for (const obj of allObjects) {
        if (!obj.Key || obj.Key.endsWith("/")) continue; // Skip folders themselves

        // Extract the folder name (collection item ID)
        // Adjust logic here if you have deeper nesting
        const parts = obj.Key.split("/");

        // If file is at root, we can skip or assign to a "root" collection
        if (parts.length < 2) continue;

        // The folder name is the first part (e.g. "vacation-2024/img.jpg" -> "vacation-2024")
        const folderName = parts[0];

        const fileUrl = `${publicUrl}/${obj.Key}`;

        const size = await probeImageSize(fileUrl);

        const imageEntry: GalleryImage = {
          key: obj.Key,
          url: fileUrl,
          lastModified: obj.LastModified,
          width: size.width,
          height: size.height,
        };

        if (!groups.has(folderName)) {
          groups.set(folderName, []);
        }
        groups.get(folderName)?.push(imageEntry);
      }

      // Clear existing store to remove deleted items
      store.clear();

      // Create entries
      for (const [folderName, images] of groups) {
        // You can add additional metadata fetching here (e.g., look for a metadata.json in the file list)

        store.set({
          id: folderName,
          data: {
            title:
              folderName.charAt(0).toUpperCase() +
              folderName.slice(1).replace(/-/g, " "),
            imageCount: images.length,
            coverImage: images[0]?.url || null,
            images: images,
          },
        });
      }

      logger.info(`Loaded ${groups.size} collections from R2`);
    },
  };
}
