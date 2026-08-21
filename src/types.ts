export type Topic = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId: string | null;
};

export type Link = {
  id: string;
  fromId: string;
  toId: string;
};

export type Theme = "default" | "dark" | "ocean" | "sunset";

export type MindMap = {
  id: string;
  title: string;
  isSample: boolean;
  theme?: Theme;
  createdAt: number;
  updatedAt: number;
  topics: Topic[];
  links: Link[];
};

export type MapSummary = {
  id: string;
  title: string;
  isSample: boolean;
  updatedAt: number;
  topicCount: number;
};

export const FILE_FORMAT = "local-mind-map" as const;
export const FILE_VERSION = 1 as const;

export type ExportedMap = {
  format: typeof FILE_FORMAT;
  version: typeof FILE_VERSION;
  map: MindMap;
};
