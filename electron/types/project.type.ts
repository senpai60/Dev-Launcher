export type Project = {
  id: string;
  name: string;
  path: string;
  description?: string;
  icon?: string;
  groupId?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
};