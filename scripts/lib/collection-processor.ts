import fse from 'fs-extra';
import type { SimpleGit } from 'simple-git';

import { generateStableHash } from '../utils.js';
import type {
  FolderType,
  DataStructure,
  IdRegistry,
  CollectionFile,
  Collection,
  Collections,
} from '../types.js';

export async function processCollections(
  data: DataStructure,
  git: SimpleGit,
  idRegistry: IdRegistry,
): Promise<Collections> {
  const collections: Collections = {};

  for (const item of fse.readdirSync('./dist/collections')) {
    const file = (await fse.readJSON(`./dist/collections/${item}`)) as CollectionFile;

    if (file.draft === true) continue;

    const collectionName = item.replace('.json', '');
    const canonicalPath = `collections/${collectionName}`;
    const stableHash = generateStableHash(canonicalPath, 'marketplace');

    if (idRegistry.paths.has(canonicalPath)) {
      console.error('Duplicate path: %s already exists', canonicalPath);
      process.exit(1);
    }

    if (idRegistry.hashes.has(stableHash)) {
      console.error(
        'Error: %s and %s generate same hash',
        canonicalPath,
        idRegistry.hashes.get(stableHash),
      );
      process.exit(1);
    }

    idRegistry.paths.add(canonicalPath);
    idRegistry.hashes.set(stableHash, canonicalPath);

    const history = await git.log({
      file: `./data/collections/${item}`,
      strictDate: true,
    });
    const updatedAt = new Date(history.latest!.date).toISOString();
    const createdAt = new Date(history.all[history.all.length - 1].date).toISOString();

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
      created_at: createdAt,
      updated_at: updatedAt,
    };

    if (file.news) {
      collection.news_link = file.news_link;
    }

    collection.items?.forEach((collectionItem) => {
      const [type, name] = collectionItem.split('/');

      if (!data[type as FolderType]?.[name]) {
        console.error(
          'Error: Item "%s" in the "%s" collection does not exist',
          collectionItem,
          collection.name,
        );
        process.exit(1);
      }

      data[type as FolderType][name].in_collections.push(collection.name);
    });

    collections[collection.name] = collection;
  }

  return collections;
}
