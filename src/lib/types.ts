export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "other";

export interface StyleRef {
  id: string;
  platform: SocialPlatform;
  url: string;
  note: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  notes: string;
  color: string;
  createdAt: string;
  styleRefs: StyleRef[];
}

export type MaterialType = "project" | "library";

export interface MaterialLink {
  id: string;
  clientId: string;
  title: string;
  url: string;
  shootDate: string;
  type: MaterialType;
  tags: string[];
  description: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  clients: Client[];
  materials: MaterialLink[];
}

export type SortOption =
  | "newest-shoot"
  | "oldest-shoot"
  | "recently-added"
  | "alphabetical";

export interface FilterState {
  search: string;
  clientId: string;
  type: MaterialType | "";
  favorite: boolean;
  tag: string;
  sort: SortOption;
}
