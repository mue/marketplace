import { OUTPUT_CONFIG } from '../config.js';
import type {
  DataStructure,
  Collections,
  Curators,
  IdIndex,
  ManifestOutput,
  ManifestLite,
  SearchIndex,
  StatsOutput,
  ExtendedItemSummary,
  CategoryTag,
} from '../types.js';

export function buildManifest(
  data: DataStructure,
  collections: Collections,
  curators: Curators,
  idIndex: IdIndex,
  version: string,
  generatedAt: string,
): ManifestOutput {
  return {
    _version: version,
    _generated_at: generatedAt,
    _schema_version: OUTPUT_CONFIG.SCHEMA_VERSION,
    collections,
    curators,
    ...data,
    _id_index: idIndex,
  };
}

export function buildManifestLite(
  allItems: ExtendedItemSummary[],
  collections: Collections,
  version: string,
  generatedAt: string,
): ManifestLite {
  return {
    _version: version,
    _generated_at: generatedAt,
    _schema_version: OUTPUT_CONFIG.SCHEMA_VERSION,
    items: allItems.map((item) => ({
      id: item.id,
      name: item.name,
      display_name: item.display_name,
      type: item.type,
      author: item.author,
      icon_url: item.icon_url,
      colour: item.colour,
      blurhash: item.blurhash,
    })),
    collections: Object.values(collections).map((col) => ({
      id: col.id,
      name: col.name,
      display_name: col.display_name,
      img: col.img,
    })),
  };
}

export function buildSearchIndex(allItems: ExtendedItemSummary[]): SearchIndex {
  const authorsMap: Record<string, string[]> = {};
  const keywordsMap: Record<string, string[]> = {};
  const categoryTagsMap: Record<string, string[]> = {};

  for (const item of allItems) {
    (authorsMap[item.author] ??= []).push(item.id);

    for (const keyword of item.keywords ?? []) {
      (keywordsMap[keyword] ??= []).push(item.id);
    }

    for (const tag of item.category_tags ?? []) {
      (categoryTagsMap[tag] ??= []).push(item.id);
    }
  }

  return {
    items: allItems.map((item) => ({
      id: item.id,
      canonical_path: item.canonical_path,
      type: item.type,
      search_text: item.search_text,
      display_name: item.display_name,
      author: item.author,
      keywords: item.keywords,
      category_tags: item.category_tags,
    })),
    authors: authorsMap,
    keywords: keywordsMap,
    category_tags: categoryTagsMap as Record<CategoryTag, string[]>,
  };
}

export function buildStats(
  allItems: ExtendedItemSummary[],
  data: DataStructure,
  collections: Collections,
  curators: Curators,
  generatedAt: string,
): StatsOutput {
  const sortedItems = [...allItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return {
    total_items: allItems.length,
    items_by_category: {
      preset_settings: Object.keys(data.preset_settings).length,
      photo_packs: Object.keys(data.photo_packs).length,
      quote_packs: Object.keys(data.quote_packs).length,
    },
    total_collections: Object.keys(collections).length,
    total_curators: Object.keys(curators).length,
    recent_items: sortedItems.slice(0, OUTPUT_CONFIG.RECENT_ITEMS_COUNT),
    generated_at: generatedAt,
  };
}
