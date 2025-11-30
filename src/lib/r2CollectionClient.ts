import type { GalleryImage } from "~/content/config";

// --- 1. Define Types ---

export interface R2ClientOptions {
  /** Your Cloudflare Account ID. */
  accountId: string;
  /** The name of your R2 bucket. */
  bucketName: string;
  /** Your R2 Access Key ID. */
  accessKeyId: string;
  /** Your R2 Secret Access Key. */
  secretAccessKey: string;
  /** The public URL base for the bucket (e.g., 'https://your-domain.com/files'). */
  publicUrl: string;
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
  private bucket: R2Bucket;
  private options: R2ClientOptions;

  constructor(bucket: R2Bucket, options: R2ClientOptions) {
    this.options = options;
    const { accountId, accessKeyId, secretAccessKey } = options;

    this.bucket = bucket;
  }

  /**
   * Helper function to fetch specific object metadata.
   * Assumes dimensions are stored in lowercase metadata keys, e.g., 'x-amz-meta-width'.
   */
  private async getImageMetadata(
    key: string
  ): Promise<{ width: number; height: number; blurhash: string }> {
    const response = await this.bucket.get(key);

    console.log({ meta: response?.customMetadata });

    const metadata = response?.customMetadata || {};

    // R2 metadata is always returned in lowercase. Check for 'width' and 'height'.
    const widthStr = metadata["width"] || metadata["w"];
    const heightStr = metadata["height"] || metadata["h"];
    const blurhash = metadata["blurhash"];

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
      blurhash,
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
    const { bucketName: bucket, publicUrl } = this.options;

    let allObjects: R2Object[] = [];

    let cursor: string | undefined = undefined;

    while (true) {
      const list = await this.bucket.list({ prefix: slug, cursor });

      allObjects.push(...list.objects);

      if (!list.truncated) break;
      cursor = list.cursor;
    }

    const imageFiles = allObjects.filter(
      (obj) =>
        obj.key &&
        obj.key.indexOf(`${slug}/`) !== -1 &&
        obj.key !== slug &&
        !obj.key.endsWith("/")
    );

    if (imageFiles.length === 0) {
      return null;
    }

    // --- Step 2: Concurrently fetch metadata (width/height) ---
    const imagePromises: Promise<GalleryImage>[] = imageFiles.map(
      async (obj) => {
        const fileKey = obj.key!;
        console.log({ fileKey });
        const fileUrl = `${publicUrl}/${fileKey}`;
        const { width, height, blurhash } =
          await this.getImageMetadata(fileKey);

        return {
          key: fileKey,
          src: fileUrl,
          width: width,
          height: height,
          blurhash: blurhash,
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
        .filter((img) => img.src.indexOf(`_${groupName}_`) !== -1)
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
        coverImage: sortedImages[0]?.src || null,
        galleryCollection: sortedImages,
        imgGroups: imgGroups,
      },
    };
  }
}
