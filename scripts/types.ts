export type FolderType = 'photo_packs' | 'quote_packs' | 'preset_settings';

export interface PhotoPackItem {
  name: string;
  description: string;
  author: string;
  icon_url: string;
  photos: string[];
  language?: string;
  draft?: boolean;
  colour?: string;
  id?: string;
  canonical_path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QuotePackItem {
  name: string;
  description: string;
  author: string;
  quotes: Array<{ quote: string; author?: string }>;
  language?: string;
  draft?: boolean;
  icon_url?: string;
  colour?: string;
  id?: string;
  canonical_path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PresetSettingsItem {
  name: string;
  description: string;
  author: string;
  settings: Record<string, unknown>;
  language?: string;
  draft?: boolean;
  icon_url?: string;
  colour?: string;
  id?: string;
  canonical_path?: string;
  created_at?: string;
  updated_at?: string;
}

export type ItemData = PhotoPackItem | QuotePackItem | PresetSettingsItem;

export interface CollectionFile {
  name: string;
  img: string;
  description: string;
  news?: boolean;
  items?: string[];
  news_link?: string;
  draft?: boolean;
}

export interface Collection {
  name: string;
  display_name: string;
  img: string;
  description: string;
  news: boolean;
  items: string[] | null;
  id: string;
  canonical_path: string;
  item_count: number;
  created_at: string;
  updated_at: string;
  news_link?: string;
}

export interface ItemSummary {
  name: string;
  display_name: string;
  icon_url?: string;
  colour?: string;
  author: string;
  language?: string;
  in_collections: string[];
  id: string;
  canonical_path: string;
  type: FolderType;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface IdRegistry {
  hashes: Map<string, string>;
  paths: Set<string>;
}

export interface DataStructure {
  preset_settings: Record<string, ItemSummary>;
  photo_packs: Record<string, ItemSummary>;
  quote_packs: Record<string, ItemSummary>;
}

export interface Curators {
  [author: string]: string[];
}

export interface Collections {
  [name: string]: Collection;
}

export interface IdIndex {
  [hash: string]: string;
}

export interface ManifestOutput {
  _version: string;
  _generated_at: string;
  _schema_version: string;
  collections: Collections;
  curators: Curators;
  preset_settings: Record<string, ItemSummary>;
  photo_packs: Record<string, ItemSummary>;
  quote_packs: Record<string, ItemSummary>;
  _id_index: IdIndex;
}

// Enhanced types for Phase 2 & 3
export interface ExtendedItemSummary extends ItemSummary {
  tags: string[];
  search_text: string;
  slug: string;
  isDark?: boolean;
  isLight?: boolean;
}

export interface SearchIndex {
  items: Array<{
    id: string;
    canonical_path: string;
    type: FolderType;
    search_text: string;
    tags: string[];
    display_name: string;
    author: string;
  }>;
  tags: Record<string, string[]>; // tag -> item IDs
  authors: Record<string, string[]>; // author -> item IDs
}

export interface StatsOutput {
  total_items: number;
  items_by_category: Record<FolderType, number>;
  total_collections: number;
  total_curators: number;
  recent_items: ExtendedItemSummary[];
  popular_tags: Array<{ tag: string; count: number }>;
  generated_at: string;
}

export interface ManifestLite {
  _version: string;
  _generated_at: string;
  _schema_version: string;
  items: Array<{
    id: string;
    name: string;
    display_name: string;
    type: FolderType;
    author: string;
    icon_url?: string;
    colour?: string;
  }>;
  collections: Array<{
    id: string;
    name: string;
    display_name: string;
    img: string;
  }>;
}

export interface FilterOptions {
  tags?: string[];
  author?: string;
  color_range?: string;
  date_from?: string;
  date_to?: string;
  min_items?: number;
  max_items?: number;
  language?: string;
}

export interface SortOptions {
  field: 'newest' | 'oldest' | 'popular' | 'name' | 'item_count' | 'updated';
  order: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_more: boolean;
}

export interface RelatedItemsResponse {
  item: ItemSummary;
  related: ItemSummary[];
  reason: string;
}
