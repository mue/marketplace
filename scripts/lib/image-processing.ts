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
    console.error('Error reading %s', iconUrl);
    return null;
  }
}

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
      const res = await fetch(photoUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`Failed to fetch photo: ${photoUrl} (${res.status})`);
        return null;
      }

      const imageBuffer = await res.arrayBuffer();
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
        console.warn(`Timeout fetching photo: ${photoUrl}`);
      } else {
        console.warn(
          `Error processing photo ${photoUrl}:`,
          e instanceof Error ? e.message : String(e),
        );
      }

      return null;
    }
  });
}

export async function attachPhotoBlurhashes(
  photoPackFile: PhotoPackItem,
  fileHash: string,
  cache: BuildCacheData,
  photoLimit: Limiter,
): Promise<number> {
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
