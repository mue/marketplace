export type FolderType = 'photo_packs' | 'quote_packs' | 'preset_settings';

// Predefined category tags for better discoverability
export type CategoryTag =
  // General themes
  | 'nature' | 'urban' | 'minimal' | 'colorful' | 'dark' | 'light'
  // Photo-specific
  | 'landscapes' | 'architecture' | 'animals' | 'space' | 'abstract'
  | 'seasonal' | 'travel' | 'vehicles' | 'food' | 'sports'
  // Quote-specific
  | 'motivational' | 'philosophical' | 'humor' | 'facts' | 'wisdom'
  // Setting-specific
  | 'productivity' | 'aesthetic' | 'gaming' | 'professional';

export interface PhotoPackItem {
  name: string;
  description: string;
  author: string;
  icon_url: string;
  photos: string[];
  language?: string;
  keywords?: string[]; // Manual curated keywords for better discovery
  category_tags?: CategoryTag[]; // Predefined category tags
  draft?: boolean;
  colour?: string;
  blurhash?: string;
  photo_blurhashes?: Record<string, string>; // Blurhashes for individual photos keyed by URL
  image_api?: boolean; // Indicates photos come from dynamic API (skip blurhashing)
  // API pack fields
  api_enabled?: boolean;
  api_provider?: string;
  api_endpoint?: string; // The API endpoint URL to fetch photos from
  direct_api?: boolean; // If true, frontend calls provider directly (no backend proxy)
  requires_api_key?: boolean;
  cache_refresh_interval?: number; // Optional cache refresh interval in seconds (default: 3600)
  settings_schema?: Array<{
    key: string;
    type: string; // 'dropdown' | 'chipselect' | 'text' | 'switch' | 'slider'
    label: string;
    placeholder?: string;
    default?: unknown;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    secure?: boolean; // For API keys - stored base64 encoded
    help_text?: string;
    dynamic?: boolean; // Load options from API
    options_source?: string; // e.g., 'api:categories'
    min?: number; // For slider
    max?: number; // For slider
    step?: number; // For slider
  }>;
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
  keywords?: string[]; // Manual curated keywords for better discovery
  category_tags?: CategoryTag[]; // Predefined category tags
  draft?: boolean;
  icon_url?: string;
  colour?: string;
  blurhash?: string;
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
  keywords?: string[]; // Manual curated keywords for better discovery
  category_tags?: CategoryTag[]; // Predefined category tags
  draft?: boolean;
  icon_url?: string;
  colour?: string;
  blurhash?: string;
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
  blurhash?: string;
  author: string;
  language?: string;
  in_collections: string[];
  id: string;
  canonical_path: string;
  type: FolderType;
  item_count: number;
  created_at: string;
  updated_at: string;
  views?: number;
  downloads?: number;
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
  search_text: string;
  slug: string;
  keywords?: string[];
  category_tags?: CategoryTag[];
  isDark?: boolean;
  isLight?: boolean;
}

export interface SearchIndex {
  items: Array<{
    id: string;
    canonical_path: string;
    type: FolderType;
    search_text: string;
    display_name: string;
    author: string;
    keywords?: string[];
    category_tags?: CategoryTag[];
  }>;
  authors: Record<string, string[]>; // author -> item IDs
  keywords: Record<string, string[]>; // keyword -> item IDs
  category_tags: Record<CategoryTag, string[]>; // category_tag -> item IDs
}

export interface StatsOutput {
  total_items: number;
  items_by_category: Record<FolderType, number>;
  total_collections: number;
  total_curators: number;
  recent_items: ExtendedItemSummary[];
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
    blurhash?: string;
  }>;
  collections: Array<{
    id: string;
    name: string;
    display_name: string;
    img: string;
  }>;
}

export interface FilterOptions {
  author?: string;
  keywords?: string[];
  category_tags?: CategoryTag[];
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
