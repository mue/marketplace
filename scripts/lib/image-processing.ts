import sharp from 'sharp';
import { getAverageColor } from 'fast-average-color-node';
import { encode } from 'blurhash';

import { BUILD_CONFIG } from '../config.js';
import type { BuildCacheData, PhotoPackItem, PhotoEntry } from '../types.js';

type Limiter = <T>(fn: () => Promise<T>) => Promise<T>;

export interface ColourResult {
  colour: string;
  isDark: boolean;
  isLight: boolean;
}

/**
 * Fetch an icon URL, boost its saturation with sharp, then extract the
 * average colour. Reads from and writes to `cache.colorCache`.
 *
 * Returns null if the fetch or colour extraction fails.
 */
export async function extractIconColour(
  iconUrl: string,
  cache: BuildCacheData,
): Promise<ColourResult | null> {
  if (cache.colorCache[iconUrl]) {
    return cache.colorCache[iconUrl];
  }

  try {
    const buffer = await (await fetch(iconUrl)).arrayBuffer();
    const saturated = await sharp(buffer)
      .modulate({ saturation: BUILD_CONFIG.COLOR_SATURATION_MULTIPLIER })
      .toBuffer();
    const colour = await getAverageColor(saturated, { ignoredColor: [0, 0, 0] });

    const result: ColourResult = {
      colour: colour.hex,
      isDark: colour.isDark,
      isLight: colour.isLight,
    };
    cache.colorCache[iconUrl] = result;
    return result;
  } catch {
    console.error('error reading %s', iconUrl);
    return null;
  }
}

/**
 * Fetch a single photo URL, resize with sharp, and encode a blurhash.
 * The `photoLimit` rate-limiter controls how many photos are processed
 * concurrently. Reads from and writes to `cache.photoBlurhashCache`.
 *
 * Returns null if the fetch, resize, or encode fails.
 */
export async function generatePhotoBlurhash(
  photoUrl: string,
  fileHash: string,
  cache: BuildCacheData,
  photoLimit: Limiter,
): Promise<string | null> {
  const cached = cache.photoBlurhashCache[photoUrl];
  if (cached && cached.fileHash === fileHash) {
    return cached.blurhash;
  }

  return photoLimit(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), BUILD_CONFIG.PHOTO_FETCH_TIMEOUT_MS);
      const response = await fetch(photoUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`⚠️  Failed to fetch photo: ${photoUrl} (${response.status})`);
        return null;
      }

      const imageBuffer = await response.arrayBuffer();
      const resized = await sharp(imageBuffer)
        .resize(BUILD_CONFIG.BLURHASH_RESIZE_WIDTH, BUILD_CONFIG.BLURHASH_RESIZE_HEIGHT, {
          fit: 'cover',
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const blurhash = encode(
        new Uint8ClampedArray(resized.data),
        resized.info.width,
        resized.info.height,
        BUILD_CONFIG.BLURHASH_COMPONENTS_X,
        BUILD_CONFIG.BLURHASH_COMPONENTS_Y,
      );

      cache.photoBlurhashCache[photoUrl] = { blurhash, cachedAt: Date.now(), fileHash };

      return blurhash;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        console.warn(`⏱️  Timeout fetching photo: ${photoUrl}`);
      } else {
        console.warn(
          `⚠️  Error processing photo ${photoUrl}:`,
          e instanceof Error ? e.message : String(e),
        );
      }

      return null;
    }
  });
}

/**
 * Compute blurhashes for all photos in a photo pack, attach `blur_hash`
 * to each object-format photo entry in-place, and return the count of
 * successfully generated hashes.
 */
export async function attachPhotoBlurhashes(
  photoPackFile: PhotoPackItem,
  fileHash: string,
  cache: BuildCacheData,
  photoLimit: Limiter,
): Promise<number> {
  // Collect URLs — photos can be plain strings or objects with a url.default key
  const photoUrls: string[] = [];
  for (const photo of photoPackFile.photos) {
    if (typeof photo === 'string') {
      photoUrls.push(photo);
    } else if (typeof photo === 'object' && photo !== null) {
      const url = (photo as PhotoEntry).url?.default;

      if (url) {
        photoUrls.push(url);
      }
    }
  }

  // Generate blurhashes in parallel (rate-limited inside generatePhotoBlurhash)
  const results = await Promise.all(
    photoUrls.map(async (photoUrl) => ({
      photoUrl,
      blurhash: await generatePhotoBlurhash(photoUrl, fileHash, cache, photoLimit),
    })),
  );

  const photoBlurhashes: Record<string, string> = {};
  for (const { photoUrl, blurhash } of results) {
    if (blurhash) {
      photoBlurhashes[photoUrl] = blurhash;
    }
  }

  // Attach blur_hash to object-format photo entries in-place
  for (const photo of photoPackFile.photos) {
    if (typeof photo === 'object' && photo !== null) {
      const url = (photo as PhotoEntry).url?.default;
      if (url && photoBlurhashes[url]) {
        (photo as PhotoEntry).blur_hash = photoBlurhashes[url];
      }
    }
  }

  return Object.keys(photoBlurhashes).length;
}
