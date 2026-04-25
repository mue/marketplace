import fse from 'fs-extra';
import simpleGit from 'simple-git';
import pLimit from 'p-limit';

import { BUILD_CONFIG, REPO_CONFIG } from './config.js';
import type {
  FolderType,
  DataStructure,
  Curators,
  IdRegistry,
  IdIndex,
  ExtendedItemSummary,
  BuildCacheData,
} from './types.js';

import { fetchGitHistory } from './lib/git-history.js';
import { processFolder } from './lib/item-processor.js';
import { processCollections } from './lib/collection-processor.js';
import {
  buildManifest,
  buildManifestLite,
  buildSearchIndex,
  buildStats,
} from './lib/output-writers.js';

// START
const perfStart = Date.now();
console.log('Starting marketplace bundle process...');

const args = process.argv.slice(2);
const FULL_REBUILD = args.includes('--full');
const CACHE_DIR = '.build-cache';
const CACHE_FILE = `${CACHE_DIR}/build-cache.json`;

await fse.ensureDir('dist');
await fse.ensureDir(CACHE_DIR);
await fse.copy('data', 'dist');

// LOAD CACHE
let cache: BuildCacheData = { gitHistory: {}, colorCache: {}, photoBlurhashCache: {} };

if (!FULL_REBUILD && (await fse.pathExists(CACHE_FILE))) {
  try {
    cache = await fse.readJSON(CACHE_FILE);
    cache.photoBlurhashCache ??= {};
    console.log(
      `Loaded cache: ${Object.keys(cache.gitHistory).length} git, ` +
        `${Object.keys(cache.colorCache).length} color, ` +
        `${Object.keys(cache.photoBlurhashCache).length} photo entries`,
    );
  } catch {
    console.warn('Failed to load cache, starting fresh');
    cache = { gitHistory: {}, colorCache: {}, photoBlurhashCache: {} };
  }
} else if (FULL_REBUILD) {
  console.log('Full rebuild requested, skipping cache');
}

// INIT GIT
let baseDir = '.';
if (process.env.CF_PAGES === '1') {
  await simpleGit().clone(REPO_CONFIG.GITHUB_URL, REPO_CONFIG.CF_PAGES_CLONE_DIR, {
    '--filter': 'tree:0',
  });
  baseDir = `./${REPO_CONFIG.CF_PAGES_CLONE_DIR}`;
}

const git = simpleGit({ baseDir });

// SET LIMITS
const limit = pLimit(BUILD_CONFIG.CONCURRENCY_LIMIT);
const photoLimit = pLimit(BUILD_CONFIG.PHOTO_PROCESSING_RATE_LIMIT);

// STATE
const FOLDERS: FolderType[] = ['preset_settings', 'photo_packs', 'quote_packs'];

const idRegistry: IdRegistry = { hashes: new Map(), paths: new Set() };
const data: DataStructure = { preset_settings: {}, photo_packs: {}, quote_packs: {} };
const curators: Curators = {};

// fetch history for updated_at, and to detect changes
const allDataPaths: string[] = [];
for (const folder of FOLDERS) {
  if (!fse.existsSync(`./data/${folder}`)) continue;

  for (const item of fse.readdirSync(`./data/${folder}`)) {
    allDataPaths.push(`./data/${folder}/${item}`);
  }
}

console.log('Fetching git history...');
const gitHistoryMap = await fetchGitHistory(allDataPaths, cache, git);

// process items per folder
const ctx = { gitHistoryMap, idRegistry, cache, photoLimit };

for (const folder of FOLDERS) {
  const results = await processFolder(folder, ctx, limit);

  for (const result of results) {
    if (!result) continue;

    data[folder][result.name] = result.summary;
    (curators[result.author] ??= []).push(result.canonicalPath);
  }
}

// process collections and indexes
const collections = await processCollections(data, git, idRegistry);
const idIndex: IdIndex = Object.fromEntries(idRegistry.hashes);

// write outputs
const packageJson = await fse.readJSON('./package.json');
const generatedAt = new Date().toISOString();
const { version } = packageJson;

const allItems = [
  ...Object.values(data.preset_settings),
  ...Object.values(data.photo_packs),
  ...Object.values(data.quote_packs),
] as ExtendedItemSummary[];

console.log('Writing outputs...');
await Promise.all([
  fse.writeJSON(
    './dist/manifest.json',
    buildManifest(data, collections, curators, idIndex, version, generatedAt),
  ),
  fse.writeJSON(
    './dist/manifest-lite.json',
    buildManifestLite(allItems, collections, version, generatedAt),
  ),
  fse.writeJSON('./dist/search-index.json', buildSearchIndex(allItems)),
  fse.writeJSON(
    './dist/stats.json',
    buildStats(allItems, data, collections, curators, generatedAt),
  ),
]);
console.log('Written manifest.json, manifest-lite.json, search-index.json, stats.json');

// SET CACHE
await fse.writeJSON(CACHE_FILE, cache, { spaces: 2 });
console.log(
  `Saved cache: ${Object.keys(cache.gitHistory).length} git, ` +
    `${Object.keys(cache.colorCache).length} color entries`,
);

// SUMMARY
const duration = ((Date.now() - perfStart) / 1000).toFixed(2);
console.log(`\n Marketplace bundle complete!`);
console.log(`Total time:  ${duration}s`);
console.log(`Items:       ${allItems.length}`);
console.log(`Collections: ${Object.keys(collections).length}`);
console.log(`Curators:    ${Object.keys(curators).length}`);
