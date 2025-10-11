import fse from 'fs-extra';
import simpleGit from 'simple-git';
import sharp from 'sharp';
import { getAverageColor } from 'fast-average-color-node';
import { encode } from 'blurhash';
import crypto from 'crypto';
import pLimit from 'p-limit';
import {
  generateStableHash,
  generateSlug,
  extractTags,
  generateSearchText,
  validateItem
} from './utils.js';
import type {
  FolderType,
  ItemData,
  CollectionFile,
  Collection,
  IdRegistry,
  DataStructure,
  Curators,
  Collections,
  IdIndex,
  ManifestOutput,
  ExtendedItemSummary,
  SearchIndex,
  StatsOutput,
  ManifestLite
} from './types.js';

// Performance tracking
const perfStart = Date.now();
console.log('🚀 Starting marketplace bundle process...');

// CLI arguments for build modes
const args = process.argv.slice(2);
const FULL_REBUILD = args.includes('--full');
const CACHE_DIR = '.build-cache';

await fse.ensureDir('dist');
await fse.ensureDir(CACHE_DIR);
await fse.copy('data', 'dist');

// Load caches
interface CacheData {
  gitHistory: Record<string, { created_at: string; updated_at: string; contentHash: string }>;
  colorCache: Record<string, { colour: string; isDark: boolean; isLight: boolean }>;
}

let cache: CacheData = { gitHistory: {}, colorCache: {} };
const cacheFile = `${CACHE_DIR}/build-cache.json`;

if (!FULL_REBUILD && await fse.pathExists(cacheFile)) {
  try {
    cache = await fse.readJSON(cacheFile);
    console.log(`📦 Loaded cache: ${Object.keys(cache.gitHistory).length} git entries, ${Object.keys(cache.colorCache).length} color entries`);
  } catch (e) {
    console.warn('⚠️  Failed to load cache, starting fresh');
    cache = { gitHistory: {}, colorCache: {} };
  }
} else if (FULL_REBUILD) {
  console.log('🔄 Full rebuild requested, skipping cache');
}

let baseDir = '.';
if (process.env.CF_PAGES === '1') {
  await simpleGit().clone('https://github.com/mue/marketplace', 'build', { '--filter': 'tree:0' });
  baseDir = './build';
}
const git = simpleGit({ baseDir });

// Concurrency limiter for parallel operations
const limit = pLimit(10);

// ID registry to track uniqueness
const idRegistry: IdRegistry = {
  hashes: new Map(), // hash -> canonical_path
  paths: new Set()   // all canonical paths
};

/**
 * Generate a stable hash ID from canonical path and author
 * @param {string} canonicalPath - The item's canonical path (e.g., "photo_packs/nature")
 * @param {string} author - The item's author
 * @returns {string} 12-character hash
 */
function generateStableHash(canonicalPath: string, author: string): string {
  const content = `${canonicalPath}:${author}`;
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

/**
 * Generate URL-friendly slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Compute content hash for a file
 */
async function computeFileHash(filePath: string): Promise<string> {
  const content = await fse.readFile(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}


/**
 * Generate search text for full-text search
 */
function generateSearchText(item: ItemData, canonicalPath: string, author: string): string {
  const parts = [
    item.name,
    item.description,
    author,
    canonicalPath.replace('/', ' '),
    item.language || ''
  ];
  return parts.join(' ').toLowerCase();
}

// Required fields schema for validation
const REQUIRED_FIELDS: Record<FolderType, string[]> = {
  photo_packs: ['name', 'description', 'author', 'icon_url', 'photos'],
  quote_packs: ['name', 'description', 'author', 'quotes'],
  preset_settings: ['name', 'description', 'author', 'settings']
};

/**
 * Validate item has all required fields
 * @param {Object} file - The item data
 * @param {string} folder - The category folder
 * @param {string} canonicalPath - The item's canonical path
 */
function validateItem(file: ItemData, folder: FolderType, canonicalPath: string): void {
  const requiredFields = REQUIRED_FIELDS[folder];
  for (const field of requiredFields) {
    if (!(file as any)[field]) {
      console.error('VALIDATION ERROR: %s missing required field "%s"', canonicalPath, field);
      process.exit(1);
    }
  }

  // Validate item counts
  if (folder === 'photo_packs' && (!(file as any).photos || (file as any).photos.length === 0)) {
    console.error('VALIDATION ERROR: %s has no photos', canonicalPath);
    process.exit(1);
  }
  if (folder === 'quote_packs' && (!(file as any).quotes || (file as any).quotes.length === 0)) {
    console.error('VALIDATION ERROR: %s has no quotes', canonicalPath);
    process.exit(1);
  }
}

const curators: Curators = {};
const data: DataStructure = {
  preset_settings: {},
  photo_packs: {},
  quote_packs: {}
};

// Batch git log to get all file histories at once for performance
console.log('📝 Fetching git history for all files...');
const allPaths: string[] = [];
const pathsNeedingGitFetch: string[] = [];

for (const folder of Object.keys(data) as FolderType[]) {
  const categories = `./data/${folder}`;
  if (!fse.existsSync(categories)) continue;
  const items = fse.readdirSync(categories);
  for (const item of items) {
    const path = `./data/${folder}/${item}`;
    allPaths.push(path);

    // Check if we need to fetch git history for this file
    const fileHash = await computeFileHash(path);
    const cachedEntry = cache.gitHistory[path];

    if (!cachedEntry || cachedEntry.contentHash !== fileHash) {
      pathsNeedingGitFetch.push(path);
    }
  }
}

// Get git history for changed/new files only
const gitHistoryMap = new Map<string, { created_at: string; updated_at: string }>();

// First, load cached entries
let cacheHits = 0;
for (const path of allPaths) {
  const cachedEntry = cache.gitHistory[path];
  if (cachedEntry) {
    const fileHash = await computeFileHash(path);
    if (cachedEntry.contentHash === fileHash) {
      gitHistoryMap.set(path, {
        created_at: cachedEntry.created_at,
        updated_at: cachedEntry.updated_at
      });
      cacheHits++;
    }
  }
}

console.log(`💾 Cache hits: ${cacheHits}/${allPaths.length} files`);

// Fetch git history only for changed/new files
if (pathsNeedingGitFetch.length > 0) {
  console.log(`🔍 Fetching git history for ${pathsNeedingGitFetch.length} changed files...`);
  try {
    const allHistory = await Promise.all(
      pathsNeedingGitFetch.map((path: string) =>
        git.log({ file: path, strictDate: true })
          .then((history: any) => ({ path, history }))
          .catch((err: any) => {
            console.warn(`Warning: Could not get git history for ${path}`, err);
            return { path, history: null };
          })
      )
    );

    for (const { path, history } of allHistory) {
      if (history && history.latest) {
        const timestamps = {
          updated_at: new Date(history.latest.date).toISOString(),
          created_at: new Date(history.all[history.all.length - 1].date).toISOString()
        };
        gitHistoryMap.set(path, timestamps);

        // Update cache
        const fileHash = await computeFileHash(path);
        cache.gitHistory[path] = {
          ...timestamps,
          contentHash: fileHash
        };
      }
    }
    console.log(`✅ Fetched git history for ${pathsNeedingGitFetch.length} files`);
  } catch (e) {
    console.error('Error fetching git history:', e);
  }
} else {
  console.log('✅ All git history loaded from cache');
}

// Process items in parallel with concurrency limit
for (const folder of Object.keys(data) as FolderType[]) {
  const categories = `./data/${folder}`;
  if (!fse.existsSync(categories)) {
    continue;
  }

  const items = fse.readdirSync(categories);
  console.log(`📦 Processing ${items.length} items in ${folder}...`);

  // Process items in parallel
  const processedItems = await Promise.all(
    items.map((item: string) =>
      limit(async () => {
        const path = `./data/${folder}/${item}`;
        const file = await fse.readJSON(path) as ItemData;

        if (file.draft === true) {
          return null;
        }

        const name = item.replace('.json', '');
        const canonicalPath = `${folder}/${name}`;

        // Validate item schema
        try {
          validateItem(file, folder, canonicalPath);
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }

        // Generate stable hash ID
        const stableHash = generateStableHash(canonicalPath, file.author);

        // Validate uniqueness
        if (idRegistry.paths.has(canonicalPath)) {
          console.error('DUPLICATE PATH: %s already exists', canonicalPath);
          process.exit(1);
        }

        if (idRegistry.hashes.has(stableHash)) {
          const existing = idRegistry.hashes.get(stableHash);
          console.error('HASH COLLISION: %s and %s generate same hash', canonicalPath, existing);
          console.error('This should never happen - investigate immediately');
          process.exit(1);
        }

        // Register IDs
        idRegistry.paths.add(canonicalPath);
        idRegistry.hashes.set(stableHash, canonicalPath);

        // Get timestamps from batch git history
        const timestamps = gitHistoryMap.get(path);
        if (timestamps) {
          file.updated_at = timestamps.updated_at;
          file.created_at = timestamps.created_at;
        } else {
          // Fallback to current time if git history not available
          const now = new Date().toISOString();
          file.updated_at = now;
          file.created_at = now;
        }

        // Extract color and blurhash from icon (if available)
        let isDark = false;
        let isLight = false;
        if ((file as any).icon_url) {
          const iconUrl = (file as any).icon_url;

          // Check cache first
          if (cache.colorCache[iconUrl]) {
            const cached = cache.colorCache[iconUrl];
            file.colour = cached.colour;
            isDark = cached.isDark;
            isLight = cached.isLight;
          } else {
            // Fetch and process color
            try {
              const original = await (await fetch(iconUrl))?.arrayBuffer();
              const saturated = await sharp(original)
                .modulate({
                  saturation: 1.75
                })
                .toBuffer();
              // value, rgb, rgba, hex, hexa, isDark, isLight
              const colour = await getAverageColor(saturated, {
                ignoredColor: [0, 0, 0]
              });
              file.colour = colour.hex;
              isDark = colour.isDark;
              isLight = colour.isLight;

              // Cache the result
              cache.colorCache[iconUrl] = {
                colour: colour.hex,
                isDark: colour.isDark,
                isLight: colour.isLight
              };
            } catch (e) {
              console.error('error reading %s', iconUrl);
            }
          }
        }

        // Generate enhanced metadata
        const search_text = generateSearchText(file, canonicalPath, file.author);
        const slug = generateSlug(file.name);

        // Add ID fields to the full item data
        file.id = stableHash;
        file.canonical_path = canonicalPath;

        await fse.writeJSON(`./dist/${folder}/${item}`, file);

        const itemSummary: ExtendedItemSummary = {
          name,
          display_name: file.name,
          icon_url: (file as any).icon_url,
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
          item_count: (file as any).photos?.length || (file as any).quotes?.length || 0,
          created_at: file.created_at,
          updated_at: file.updated_at,
          search_text,
          slug,
          isDark,
          isLight,
        };

        return { name, author: file.author, canonicalPath, summary: itemSummary };
      })
    )
  );

  // Filter out null results (drafts) and add to data structure
  for (const result of processedItems) {
    if (result) {
      data[folder][result.name] = result.summary;
      if (!curators[result.author]) curators[result.author] = [];
      curators[result.author].push(result.canonicalPath);
    }
  }

  console.log(`✅ Processed ${processedItems.filter((r: any) => r !== null).length} items in ${folder}`);
}


const collections: Collections = {};
for (const item of fse.readdirSync('./dist/collections')) {
  const file = await fse.readJSON(`./dist/collections/${item}`, 'utf8') as CollectionFile;

  if (file.draft === true) {
    continue;
  }

  const collectionName = item.replace('.json', '');
  const canonicalPath = `collections/${collectionName}`;

  // Generate stable hash ID for collection
  const stableHash = generateStableHash(canonicalPath, 'marketplace');

  // Validate uniqueness
  if (idRegistry.paths.has(canonicalPath)) {
    console.error('DUPLICATE PATH: %s already exists', canonicalPath);
    process.exit(1);
  }

  if (idRegistry.hashes.has(stableHash)) {
    const existing = idRegistry.hashes.get(stableHash);
    console.error('HASH COLLISION: %s and %s generate same hash', canonicalPath, existing);
    console.error('This should never happen - investigate immediately');
    process.exit(1);
  }

  // Register IDs
  idRegistry.paths.add(canonicalPath);
  idRegistry.hashes.set(stableHash, canonicalPath);

  // Get collection timestamps
  const collectionHistory = await git.log({
    file: `./data/collections/${item}`,
    strictDate: true,
  });
  const collectionUpdatedAt = new Date(collectionHistory.latest!.date).toISOString();
  const collectionCreatedAt = new Date(collectionHistory.all[collectionHistory.all.length - 1].date).toISOString();

  const collection: Collection = {
    name: collectionName,
    display_name: file.name,
    img: file.img,
    description: file.description,
    news: file.news || false,
    items: file.items || null,
    id: stableHash,
    canonical_path: canonicalPath,
    item_count: file.items?.length || 0,
    created_at: collectionCreatedAt,
    updated_at: collectionUpdatedAt,
  };

  // news "collections" have no items
  collection.items?.forEach((item) => {
    const [type, name] = item.split('/');
    if (!data[type as FolderType][name]) {
      console.error('Item "%s" in the "%s" collection does not exist', item, collection.name);
      process.exit(1);
    }
    data[type as FolderType][name].in_collections.push(collection.name);
  });

  if (file.news) {
    collection.news_link = file.news_link;
  }

  collections[collection.name] = collection;
}


// Generate ID index for reverse lookup
const idIndex: IdIndex = {};
for (const [hash, path] of idRegistry.hashes) {
  idIndex[hash] = path;
}

// Read package.json for version
const packageJson = await fse.readJSON('./package.json');
const generatedAt = new Date().toISOString();

// Generate full manifest (existing functionality)
console.log('📝 Generating full manifest...');
await fse.writeJSON('./dist/manifest.json', {
  _version: packageJson.version,
  _generated_at: generatedAt,
  _schema_version: "3.0",
  collections,
  curators,
  ...data,
  _id_index: idIndex,
} as ManifestOutput);
console.log('✅ Generated manifest.json');

// Generate manifest-lite (minimal metadata for fast loading)
console.log('📝 Generating lite manifest...');
const allItems = [
  ...Object.values(data.preset_settings),
  ...Object.values(data.photo_packs),
  ...Object.values(data.quote_packs)
] as ExtendedItemSummary[];

const manifestLite: ManifestLite = {
  _version: packageJson.version,
  _generated_at: generatedAt,
  _schema_version: "3.0",
  items: allItems.map(item => ({
    id: item.id,
    name: item.name,
    display_name: item.display_name,
    type: item.type,
    author: item.author,
    icon_url: item.icon_url,
    colour: item.colour,
    blurhash: item.blurhash
  })),
  collections: Object.values(collections).map(col => ({
    id: col.id,
    name: col.name,
    display_name: col.display_name,
    img: col.img
  }))
};
await fse.writeJSON('./dist/manifest-lite.json', manifestLite);
console.log('✅ Generated manifest-lite.json');

// Generate search index
console.log('📝 Generating search index...');
const authorsMap: Record<string, string[]> = {};
const keywordsMap: Record<string, string[]> = {};
const categoryTagsMap: Record<string, string[]> = {};

for (const item of allItems) {
  // Build authors map
  if (!authorsMap[item.author]) authorsMap[item.author] = [];
  authorsMap[item.author].push(item.id);

  // Build keywords map
  if (item.keywords) {
    for (const keyword of item.keywords) {
      if (!keywordsMap[keyword]) keywordsMap[keyword] = [];
      keywordsMap[keyword].push(item.id);
    }
  }

  // Build category_tags map
  if (item.category_tags) {
    for (const tag of item.category_tags) {
      if (!categoryTagsMap[tag]) categoryTagsMap[tag] = [];
      categoryTagsMap[tag].push(item.id);
    }
  }
}

const searchIndex: SearchIndex = {
  items: allItems.map(item => ({
    id: item.id,
    canonical_path: item.canonical_path,
    type: item.type,
    search_text: item.search_text,
    display_name: item.display_name,
    author: item.author,
    keywords: item.keywords,
    category_tags: item.category_tags
  })),
  authors: authorsMap,
  keywords: keywordsMap,
  category_tags: categoryTagsMap as any
};
await fse.writeJSON('./dist/search-index.json', searchIndex);
console.log('✅ Generated search-index.json');

// Generate stats
console.log('📝 Generating stats...');
const sortedItems = [...allItems].sort((a, b) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);

const stats: StatsOutput = {
  total_items: allItems.length,
  items_by_category: {
    preset_settings: Object.keys(data.preset_settings).length,
    photo_packs: Object.keys(data.photo_packs).length,
    quote_packs: Object.keys(data.quote_packs).length
  },
  total_collections: Object.keys(collections).length,
  total_curators: Object.keys(curators).length,
  recent_items: sortedItems.slice(0, 20),
  generated_at: generatedAt
};
await fse.writeJSON('./dist/stats.json', stats);
console.log('✅ Generated stats.json');

// Save cache for next build
console.log('💾 Saving cache...');
await fse.writeJSON(cacheFile, cache, { spaces: 2 });
console.log(`✅ Saved cache: ${Object.keys(cache.gitHistory).length} git entries, ${Object.keys(cache.colorCache).length} color entries`);

// Performance summary
const perfEnd = Date.now();
const duration = ((perfEnd - perfStart) / 1000).toFixed(2);
console.log(`\n🎉 Marketplace bundle complete!`);
console.log(`   Total time: ${duration}s`);
console.log(`   Items processed: ${allItems.length}`);
console.log(`   Collections: ${Object.keys(collections).length}`);
console.log(`   Curators: ${Object.keys(curators).length}`);
