import fse from 'fs-extra';
import simpleGit from 'simple-git';
import sharp from 'sharp';
import { getAverageColor } from 'fast-average-color-node';
import crypto from 'crypto';

await fse.ensureDir('dist');
await fse.copy('data', 'dist');

let baseDir = '.';
if (process.env.CF_PAGES === '1') {
  await simpleGit().clone('https://github.com/mue/marketplace', 'build', { '--filter': 'tree:0' });
  baseDir = './build';
}
const git = simpleGit({ baseDir });

// ID registry to track uniqueness
const idRegistry = {
  hashes: new Map(), // hash -> canonical_path
  paths: new Set()   // all canonical paths
};

/**
 * Generate a stable hash ID from canonical path and author
 * @param {string} canonicalPath - The item's canonical path (e.g., "photo_packs/nature")
 * @param {string} author - The item's author
 * @returns {string} 12-character hash
 */
function generateStableHash(canonicalPath, author) {
  const content = `${canonicalPath}:${author}`;
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

// Required fields schema for validation
const REQUIRED_FIELDS = {
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
function validateItem(file, folder, canonicalPath) {
  const requiredFields = REQUIRED_FIELDS[folder];
  for (const field of requiredFields) {
    if (!file[field]) {
      console.error('VALIDATION ERROR: %s missing required field "%s"', canonicalPath, field);
      process.exit(1);
    }
  }

  // Validate item counts
  if (folder === 'photo_packs' && (!file.photos || file.photos.length === 0)) {
    console.error('VALIDATION ERROR: %s has no photos', canonicalPath);
    process.exit(1);
  }
  if (folder === 'quote_packs' && (!file.quotes || file.quotes.length === 0)) {
    console.error('VALIDATION ERROR: %s has no quotes', canonicalPath);
    process.exit(1);
  }
}

const curators = {};
const data = {
  preset_settings: {},
  photo_packs: {},
  quote_packs: {}
};

for (const folder of Object.keys(data)) {
  const categories = `./data/${folder}`;
  if (!fse.existsSync(categories)) {
    continue;
  }
  const items = fse.readdirSync(categories);
  for await (const item of items) {
    const path = `./data/${folder}/${item}`;
    const file = await fse.readJSON(path);

    if (file.draft === true) {
      continue;
    }

    const name = item.replace('.json', '');
    const canonicalPath = `${folder}/${name}`;

    // Validate item schema
    validateItem(file, folder, canonicalPath);

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

    // Get full git history for created_at and updated_at
    const history = await git.log({
      file: path,
      strictDate: true,
    });

    // Latest commit = updated_at
    file.updated_at = new Date(history.latest.date).toISOString();

    // First commit = created_at
    file.created_at = new Date(history.all[history.all.length - 1].date).toISOString();

    try {
      const original = await (await fetch(file.icon_url))?.arrayBuffer();
      const saturated = await sharp(original)
        .modulate({
          saturation: 1.75
        }).
        toBuffer();
      // value, rgb, rgba, hex, hexa, isDark, isLight
      const colour = await getAverageColor(saturated, {
        ignoredColor: [0, 0, 0]
      });
      file.colour = colour.hex;
    } catch (e) {
      console.error('error reading %s', file.icon_url);
      console.error(e);
    }

    // Add ID fields to the full item data
    file.id = stableHash;
    file.canonical_path = canonicalPath;

    await fse.writeJSON(`./dist/${folder}/${item}`, file);

    data[folder][name] = {
      name,
      display_name: file.name,
      icon_url: file.icon_url,
      colour: file.colour,
      author: file.author,
      language: file.language,
      in_collections: [],
      id: stableHash,
      canonical_path: canonicalPath,
      type: folder,
      item_count: file.photos?.length || file.quotes?.length || 0,
      created_at: file.created_at,
      updated_at: file.updated_at,
    };

    if (!curators[file.author]) curators[file.author] = [];
    curators[file.author].push(folder + '/' + name);
  }
}


const collections = {};
for (const item of fse.readdirSync('./dist/collections')) {
  const file = await fse.readJSON(`./dist/collections/${item}`, 'utf8');

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
  const collectionUpdatedAt = new Date(collectionHistory.latest.date).toISOString();
  const collectionCreatedAt = new Date(collectionHistory.all[collectionHistory.all.length - 1].date).toISOString();

  const collection = {
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
    if (!data[type][name]) {
      console.error('Item "%s" in the "%s" collection does not exist', item, collection.name);
      process.exit(1);
    }
    data[type][name].in_collections.push(collection.name);
  });

  if (file.news) {
    collection.news_link = file.news_link;
  }

  collections[collection.name] = collection;
}


// Generate ID index for reverse lookup
const idIndex = {};
for (const [hash, path] of idRegistry.hashes) {
  idIndex[hash] = path;
}

// Read package.json for version
const packageJson = await fse.readJSON('./package.json');

await fse.writeJSON('./dist/manifest.json', {
  _version: packageJson.version,
  _generated_at: new Date().toISOString(),
  _schema_version: "2.0",
  collections,
  curators,
  ...data,
  _id_index: idIndex,
});
