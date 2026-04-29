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

export type WorkspaceType = "salary" | "freelance" | "opportunity";

export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  type: WorkspaceType;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface Client {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  notes: string;
  color: string;
  order: number;
  createdAt: string;
  styleRefs: StyleRef[];
}

export type MaterialType = "project" | "library";

export interface MaterialLink {
  id: string;
  workspaceId: string;
  clientId: string;
  title: string;
  url: string;
  localPath?: string;
  shootDate: string;
  type: MaterialType;
  tags: string[];
  description: string;
  isFavorite: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "pending" | "done";

export interface DailyTask {
  id: string;
  workspaceId: string;
  date: string;
  title: string;
  clientId: string;
  materialId: string | null;
  styleRefIds: string[];
  status: TaskStatus;
  order: number;
  notes: string;
  createdAt: string;
}

export interface AppData {
  workspaces: Workspace[];
  clients: Client[];
  materials: MaterialLink[];
  dailyTasks: DailyTask[];
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
