// R2Client.ts

import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  type _Object,
} from "@aws-sdk/client-s3";

// --- 1. Define Types ---

export interface R2ClientOptions {
  /** Your Cloudflare Account ID. */
  accountId: string;
  /** The name of your R2 bucket. */
  bucket: string;
  /** Your R2 Access Key ID. */
  accessKeyId: string;
  /** Your R2 Secret Access Key. */
  secretAccessKey: string;
  /** The public URL base for the bucket (e.g., 'https://your-domain.com/files'). */
  publicUrl: string;
}

export interface GalleryImage {
  key: string;
  url: string;
  lastModified: Date | undefined;
  // Added back width and height, now sourced from metadata
  width: number;
  height: number;
}

export interface CollectionItem {
  id: string;
  data: {
    title: string;
    imageCount: number;
    coverImage: string | null;
    /** The main, sorted list of all images in the collection. */
    galleryCollection: GalleryImage[];
    /** Images grouped by groupName, e.g., { "details": [...], "people": [...] } */
    imgGroups: { [key: string]: GalleryImage[] };
  };
}

// --- 2. R2 Collection Client Class ---

export class R2CollectionClient {
  private client: S3Client;
  private options: R2ClientOptions;

  constructor(options: R2ClientOptions) {
    this.options = options;
    const { accountId, accessKeyId, secretAccessKey } = options;

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Helper function to fetch specific object metadata.
   * Assumes dimensions are stored in lowercase metadata keys, e.g., 'x-amz-meta-width'.
   */
  private async getImageMetadata(
    key: string
  ): Promise<{ width: number; height: number }> {
    const command = new HeadObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    const metadata = response.Metadata || {};

    // R2 metadata is always returned in lowercase. Check for 'width' and 'height'.
    const widthStr = metadata["width"] || metadata["w"];
    const heightStr = metadata["height"] || metadata["h"];

    let width = 300;
    if (widthStr) {
      width = parseInt(widthStr, 10);
    }

    let height = 400;
    if (heightStr) {
      height = parseInt(heightStr, 10);
    }

    return {
      width,
      height,
    };
  }

  /**
   * Converts a string to Title Case (e.g., "vacation-2024" -> "Vacation 2024").
   */
  private toTitleCase(str: string): string {
    return str
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Fetches a single collection item by slug and processes its images into sorted lists and groups.
   * @param slug The collection ID (folder name).
   * @param groupNames An array of group names used to filter images (e.g., ["details", "people"]).
   */
  public async getItemBySlug(
    slug: string,
    groupNames: string[] = []
  ): Promise<CollectionItem | null> {
    const { bucket, publicUrl } = this.options;
    const prefix = `${slug}/`; // List objects only within the specified folder

    let allObjects: _Object[] = [];
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;

    // ... (R2 List logic as before - omitted for brevity)
    while (isTruncated) {
      const command: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });
      const response = await this.client.send(command);
      if (response.Contents) {
        allObjects.push(...response.Contents);
      }
      isTruncated = response.IsTruncated ?? false;
      continuationToken = response.NextContinuationToken;
    }

    const imageFiles = allObjects.filter(
      (obj) => obj.Key && obj.Key !== prefix && !obj.Key.endsWith("/")
    );

    if (imageFiles.length === 0) {
      return null;
    }

    // --- Step 2: Concurrently fetch metadata (width/height) ---
    const imagePromises: Promise<GalleryImage>[] = imageFiles.map(
      async (obj) => {
        const fileKey = obj.Key!;
        const fileUrl = `${publicUrl}/${fileKey}`;
        const { width, height } = await this.getImageMetadata(fileKey);

        return {
          key: fileKey,
          url: fileUrl,
          lastModified: obj.LastModified,
          width: width,
          height: height,
        };
      }
    );

    // Wait for all metadata calls to complete
    const images: GalleryImage[] = await Promise.all(imagePromises);

    // --- Step 3: Apply Metadata and Return ---

    // 3a. Sorted main collection (equivalent to `galleryCollection`)
    const sortedImages = images.toSorted(
      (a, b) => a.key?.localeCompare(b.key ?? "") ?? -1
    );

    // 3b. Grouped images (equivalent to `imgGroups`)
    const imgGroups: {
      [key: string]: GalleryImage[];
    } = {};

    groupNames.forEach((groupName) => {
      // Logic: Filter images where the URL (or key) contains the pattern `_groupName_`
      const groupImages = images
        .filter((img) => img.url.indexOf(`_${groupName}_`) !== -1)
        .toSorted((a, b) => a.key?.localeCompare(b.key ?? "") ?? -1);

      imgGroups[groupName] = groupImages;
      // console.log({ groupName, images: imgGroups[groupName].length }); // Original debug line
    });

    // --- Step 4: Final Structure and Return ---

    const title = this.toTitleCase(slug);

    return {
      id: slug,
      data: {
        title: title,
        imageCount: images.length,
        coverImage: sortedImages[0]?.url || null,
        galleryCollection: sortedImages,
        imgGroups: imgGroups,
      },
    };
  }
}
