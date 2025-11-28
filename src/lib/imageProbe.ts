import * as http from "http";
import * as https from "https";
import { URL } from "url";

/**
 * Interface representing the dimensions and type of the image.
 */
interface ImageProbeResult {
  width: number;
  height: number;
  type: string;
  mime: string;
}

/**
 * Error class for image probing failures.
 */
class ProbeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProbeError";
  }
}

/**
 * Main function to get image dimensions from a URL without downloading the full file.
 * @param url The image URL to probe.
 * @param timeoutMs Timeout in milliseconds (default 10000).
 */
export function probeImageSize(
  url: string,
  timeoutMs: number = 10000
): Promise<ImageProbeResult> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === "https:" ? https : http;

    const options: https.RequestOptions = {
      method: "GET",
      headers: {
        "User-Agent": "ImageProbe/1.0",
      },
      timeout: timeoutMs,
    };

    const req = protocol.get(url, options, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.destroy();
        return reject(new ProbeError(`HTTP Status ${res.statusCode}`));
      }

      let buffer = Buffer.alloc(0);
      let isResolved = false;

      res.on("data", (chunk: Buffer) => {
        if (isResolved) return;

        buffer = Buffer.concat([buffer, chunk]);

        // Try to parse the buffer
        const result = parseDimensions(buffer);

        if (result) {
          isResolved = true;
          // We found the dimensions, stop downloading immediately!
          res.destroy();
          resolve(result);
        }

        // Safety: If buffer gets too large without finding headers (e.g. 50KB), abort.
        // Most headers are within the first few KB.
        if (buffer.length > 50 * 1024) {
          isResolved = true;
          res.destroy();
          reject(
            new ProbeError(
              "Buffer limit exceeded without finding image dimensions."
            )
          );
        }
      });

      res.on("end", () => {
        if (!isResolved) {
          reject(
            new ProbeError("Stream ended without finding image dimensions.")
          );
        }
      });

      res.on("error", (err) => {
        if (!isResolved) reject(err);
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new ProbeError("Request timed out"));
    });
  });
}

/**
 * Parses the buffer to find image dimensions.
 * Supports: PNG, GIF, BMP, WebP, JPEG.
 */
function parseDimensions(buffer: Buffer): ImageProbeResult | null {
  // PNG
  if (
    checkSignature(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    // IHDR chunk is always the first chunk, starts at offset 8
    // Length(4) + ChunkType(4) + Width(4) + Height(4)
    if (buffer.length < 24) return null;
    return {
      type: "png",
      mime: "image/png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  // GIF (GIF87a or GIF89a)
  if (checkSignature(buffer, [0x47, 0x49, 0x46, 0x38])) {
    if (buffer.length < 10) return null;
    return {
      type: "gif",
      mime: "image/gif",
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }

  // BMP
  if (checkSignature(buffer, [0x42, 0x4d])) {
    if (buffer.length < 26) return null;
    return {
      type: "bmp",
      mime: "image/bmp",
      width: buffer.readInt32LE(18),
      height: Math.abs(buffer.readInt32LE(22)), // Height can be negative in BMP
    };
  }

  // WebP
  // RIFF....WEBP
  if (
    checkSignature(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    if (buffer.length < 30) return null;

    const chunkHeader = buffer.toString("ascii", 12, 16);

    // VP8 (Lossy)
    if (chunkHeader === "VP8 ") {
      // Frame checks
      if (buffer.length < 30) return null;
      // Key frame check (0x9D 0x01 0x2A) check could be here
      const w = buffer.readUInt16LE(26) & 0x3fff;
      const h = buffer.readUInt16LE(28) & 0x3fff;
      return { type: "webp", mime: "image/webp", width: w, height: h };
    }

    // VP8L (Lossless)
    if (chunkHeader === "VP8L") {
      if (buffer.length < 25) return null;
      const b0 = buffer[21];
      const b1 = buffer[22];
      const b2 = buffer[23];
      const b3 = buffer[24];

      const w = 1 + (((b1 & 0x3f) << 8) | b0);
      const h = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { type: "webp", mime: "image/webp", width: w, height: h };
    }

    // VP8X (Extended)
    if (chunkHeader === "VP8X") {
      if (buffer.length < 30) return null;
      const w = buffer.readUIntLE(24, 3) + 1;
      const h = buffer.readUIntLE(27, 3) + 1;
      return { type: "webp", mime: "image/webp", width: w, height: h };
    }
  }

  // JPEG
  if (checkSignature(buffer, [0xff, 0xd8, 0xff])) {
    // JPEGs are streams of segments. We need to walk them to find SOF (Start of Frame).
    let offset = 2;
    while (offset < buffer.length) {
      // Look for FF xx
      if (buffer[offset] !== 0xff) return null; // Invalid structure or not enough data yet

      // Skip padding bytes (FF)
      while (offset < buffer.length && buffer[offset] === 0xff) offset++;

      if (offset >= buffer.length) return null; // Need more data

      const marker = buffer[offset];
      offset++;

      if (offset + 2 > buffer.length) return null; // Need length bytes
      const len = buffer.readUInt16BE(offset);

      // Markers that contain dimensions (SOF0, SOF1, SOF2)
      // 0xC0 = SOF0 (Baseline), 0xC2 = SOF2 (Progressive)
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        if (offset + len > buffer.length) return null; // Need full segment
        // Structure: Precision(1), Height(2), Width(2)
        const h = buffer.readUInt16BE(offset + 3);
        const w = buffer.readUInt16BE(offset + 5);
        return { type: "jpg", mime: "image/jpeg", width: w, height: h };
      }

      offset += len;
    }
    return null;
  }

  return null;
}

/**
 * Helper to check magic numbers at start of buffer.
 */
function checkSignature(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

// --- Example Usage (Uncomment to run) ---
/*
(async () => {
    try {
        console.log('Probing PNG...');
        const png = await probeImageSize('https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png');
        console.log(png);

        console.log('\nProbing JPEG...');
        const jpg = await probeImageSize('https://upload.wikimedia.org/wikipedia/commons/b/b6/Image_created_with_a_mobile_phone.png'); // Actually a PNG, but checking logic
        console.log(jpg);

        // A large image to demonstrate we don't download it all
        console.log('\nProbing Large Image...');
        const start = Date.now();
        const large = await probeImageSize('https://upload.wikimedia.org/wikipedia/commons/3/3d/LARGE_elevation.jpg');
        console.log(`Took ${Date.now() - start}ms`, large);
        
    } catch (e) {
        console.error('Error probing:', e);
    }
})();
*/
