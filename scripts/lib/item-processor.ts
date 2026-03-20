import fse from 'fs-extra';
import { validateItem, generateStableHash, generateSlug, generateSearchText } from '../utils.js';

import { computeFileHash } from './git-history.js';
import { extractIconColour, attachPhotoBlurhashes } from './image-processing.js';
import type {
  FolderType,
  ItemData,
  IdRegistry,
  ExtendedItemSummary,
  PhotoPackItem,
  QuotePackItem,
  BuildCacheData,
} from '../types.js';
import type { GitTimestamps } from './git-history.js';

type Limiter = <T>(fn: () => Promise<T>) => Promise<T>;

export interface ProcessedItem {
  name: string;
  author: string;
  canonicalPath: string;
  summary: ExtendedItemSummary;
}

export interface ItemProcessorContext {
  gitHistoryMap: Map<string, GitTimestamps>;
  idRegistry: IdRegistry;
  cache: BuildCacheData;
  photoLimit: Limiter;
}

/**
 * Process a single item file through the full build lifecycle:
 * read → skip drafts → validate → hash → register → timestamps →
 * icon colour → photo blurhashes → write dist file → return summary.
 *
 * Returns null for draft items.
 * Calls process.exit(1) on validation errors or ID collisions.
 */
export async function processItem(
  folder: FolderType,
  item: string,
  ctx: ItemProcessorContext,
): Promise<ProcessedItem | null> {
  const path = `./data/${folder}/${item}`;
  const file = (await fse.readJSON(path)) as ItemData;

  if (file.draft === true) return null;

  const name = item.replace('.json', '');
  const canonicalPath = `${folder}/${name}`;

  // Validate schema
  const validation = validateItem(file, folder, canonicalPath);
  if (!validation.success) {
    console.error(validation.error?.message ?? 'Validation failed');
    process.exit(1);
  }

  // Stable hash + uniqueness check
  const stableHash = generateStableHash(canonicalPath, file.author);

  if (ctx.idRegistry.paths.has(canonicalPath)) {
    console.error('DUPLICATE PATH: %s already exists', canonicalPath);
    process.exit(1);
  }

  if (ctx.idRegistry.hashes.has(stableHash)) {
    console.error(
      'HASH COLLISION: %s and %s generate same hash',
      canonicalPath,
      ctx.idRegistry.hashes.get(stableHash),
    );
    process.exit(1);
  }

  ctx.idRegistry.paths.add(canonicalPath);
  ctx.idRegistry.hashes.set(stableHash, canonicalPath);

  // Timestamps (git history or now as fallback)
  const timestamps = ctx.gitHistoryMap.get(path);
  const now = new Date().toISOString();
  file.created_at = timestamps?.created_at ?? now;
  file.updated_at = timestamps?.updated_at ?? now;

  // Icon colour
  let isDark = false;
  let isLight = false;
  if (file.icon_url) {
    const colour = await extractIconColour(file.icon_url, ctx.cache);

    if (colour) {
      file.colour = colour.colour;
      isDark = colour.isDark;
      isLight = colour.isLight;
    }
  }

  // Photo blurhashes (photo_packs only — skip API and image_api packs)
  if (
    folder === 'photo_packs' &&
    (file as PhotoPackItem).photos &&
    !(file as PhotoPackItem).image_api &&
    !(file as PhotoPackItem).api_enabled
  ) {
    const fileHash = await computeFileHash(path);
    const successCount = await attachPhotoBlurhashes(
      file as PhotoPackItem,
      fileHash,
      ctx.cache,
      ctx.photoLimit,
    );

    const total = (file as PhotoPackItem).photos.length;
    if (successCount > 0) {
      console.log(`  ✓ Added blur_hash to ${successCount}/${total} photos for ${name}`);
    } else if (total > 0) {
      console.warn(`  ⚠️  Failed to generate any photo blurhashes for ${name}`);
    }
  }

  // Enrich file with generated IDs
  file.id = stableHash;
  file.canonical_path = canonicalPath;

  await fse.writeJSON(`./dist/${folder}/${item}`, file);

  const summary: ExtendedItemSummary = {
    name,
    display_name: file.name,
    icon_url: file.icon_url,
    colour: file.colour,
    blurhash: file.blurhash,
    author: file.author,
    language: file.language,
    keywords: file.keywords,
    category_tags: file.category_tags,
    in_collections: [],
    id: stableHash,
    canonical_path: canonicalPath,
    type: folder,
    item_count:
      (file as PhotoPackItem).photos?.length ?? (file as QuotePackItem).quotes?.length ?? 0,
    created_at: file.created_at!,
    updated_at: file.updated_at!,
    search_text: generateSearchText(file, canonicalPath, file.author),
    slug: generateSlug(file.name),
    isDark,
    isLight,
    ...(folder === 'photo_packs' && {
      api_enabled: (file as PhotoPackItem).api_enabled,
      api_provider: (file as PhotoPackItem).api_provider,
      api_endpoint: (file as PhotoPackItem).api_endpoint,
      direct_api: (file as PhotoPackItem).direct_api,
      cache_refresh_interval: (file as PhotoPackItem).cache_refresh_interval,
      requires_api_key: (file as PhotoPackItem).requires_api_key,
      settings_schema: (file as PhotoPackItem).settings_schema,
    }),
  };

  return { name, author: file.author, canonicalPath, summary };
}

/**
 * Process all items in a folder in parallel (using `limit`) and return
 * the results (null entries are draft items).
 */
export async function processFolder(
  folder: FolderType,
  ctx: ItemProcessorContext,
  limit: Limiter,
): Promise<Array<ProcessedItem | null>> {
  const categories = `./data/${folder}`;
  if (!fse.existsSync(categories)) {
    return [];
  }

  const items = fse.readdirSync(categories);
  console.log(`📦 Processing ${items.length} items in ${folder}...`);

  const results = await Promise.all(
    items.map((item) => limit(() => processItem(folder, item, ctx))),
  );

  const processed = results.filter((r) => r !== null).length;
  console.log(`✅ Processed ${processed} items in ${folder}`);
  return results;
}
