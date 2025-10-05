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
