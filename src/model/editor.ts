import type { Link, MindMap, Theme, Topic } from "../types";
import {
  CHILD_GAP_X,
  CHILD_GAP_Y,
  DEFAULT_H,
  DEFAULT_W,
  MAX_LINKS,
  MAX_NODE_H,
  MAX_NODE_W,
  MAX_TEXT,
  MAX_TITLE,
  MAX_TOPICS,
  MIN_NODE_H,
  MIN_NODE_W,
} from "./constants";
import { clamp, createId, now } from "./ids";

export type EditorState = {
  map: MindMap;
  selectedId: string | null;
  past: MindMap[];
  future: MindMap[];
};

export type EditorAction =
  | { type: "hydrate"; map: MindMap }
  | { type: "setTitle"; title: string }
  | { type: "setTheme"; theme: Theme }
  | { type: "select"; id: string | null }
  | { type: "setText"; id: string; text: string }
  | { type: "beginGesture" }
  | { type: "move"; id: string; x: number; y: number; live?: boolean }
  | { type: "resize"; id: string; width: number; height: number; live?: boolean }
  | { type: "addChild"; parentId: string }
  | { type: "addSibling"; nodeId: string }
  | { type: "addFloating"; x: number; y: number }
  | { type: "deleteSelected" }
  | { type: "connect"; fromId: string; toId: string }
  | { type: "disconnect"; edgeId: string }
  | { type: "undo" }
  | { type: "redo" };

function cloneMap(map: MindMap): MindMap {
  return structuredClone(map);
}

function touch(map: MindMap): MindMap {
  return { ...map, updatedAt: now() };
}

function topicById(map: MindMap, id: string): Topic | undefined {
  return map.topics.find((t) => t.id === id);
}

function childrenOf(map: MindMap, parentId: string): Topic[] {
  return map.topics.filter((t) => t.parentId === parentId);
}

function descendants(map: MindMap, id: string): Set<string> {
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const topic of map.topics) {
      if (topic.parentId && ids.has(topic.parentId) && !ids.has(topic.id)) {
        ids.add(topic.id);
        grew = true;
      }
    }
  }
  return ids;
}

function placeChild(parent: Topic, siblings: Topic[]): { x: number; y: number } {
  const x = parent.x + parent.width + CHILD_GAP_X;
  if (siblings.length === 0) {
    return { x, y: parent.y };
  }
  const lowest = siblings.reduce((a, b) => (a.y + a.height > b.y + b.height ? a : b));
  return { x, y: lowest.y + lowest.height + CHILD_GAP_Y };
}

function makeTopic(partial: Omit<Topic, "width" | "height"> & Partial<Pick<Topic, "width" | "height">>): Topic {
  return {
    ...partial,
    width: partial.width ?? DEFAULT_W,
    height: partial.height ?? DEFAULT_H,
    text: partial.text.slice(0, MAX_TEXT),
  };
}

function treeLink(parentId: string, childId: string): Link {
  return { id: createId(), fromId: parentId, toId: childId };
}

function hasLink(map: MindMap, a: string, b: string): boolean {
  return map.links.some(
    (l) => (l.fromId === a && l.toId === b) || (l.fromId === b && l.toId === a),
  );
}

function pushHistory(state: EditorState, nextMap: MindMap, selectedId: string | null): EditorState {
  return {
    map: touch(nextMap),
    selectedId,
    past: [...state.past, cloneMap(state.map)].slice(-80),
    future: [],
  };
}

export function createBlankMap(title = "Untitled map", theme: Theme = "default"): MindMap {
  const root = makeTopic({
    id: createId(),
    text: "Central topic",
    x: 120,
    y: 220,
    parentId: null,
  });
  const timestamp = now();
  return {
    id: createId(),
    title: title.slice(0, MAX_TITLE),
    isSample: false,
    theme,
    createdAt: timestamp,
    updatedAt: timestamp,
    topics: [root],
    links: [],
  };
}

export function createEditorState(map: MindMap): EditorState {
  const root = map.topics.find((t) => t.parentId === null) ?? map.topics[0];
  return { map, selectedId: root?.id ?? null, past: [], future: [] };
}

export function reduceEditor(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "hydrate":
      return createEditorState(action.map);
    case "select":
      return { ...state, selectedId: action.id };
    case "setTitle": {
      const title = action.title.slice(0, MAX_TITLE);
      if (title === state.map.title) return state;
      return pushHistory(state, { ...state.map, title }, state.selectedId);
    }
    case "setTheme": {
      if (action.theme === state.map.theme) return state;
      return pushHistory(state, { ...state.map, theme: action.theme }, state.selectedId);
    }
    case "setText": {
      const text = action.text.slice(0, MAX_TEXT);
      const topics = state.map.topics.map((t) => (t.id === action.id ? { ...t, text } : t));
      return pushHistory(state, { ...state.map, topics }, action.id);
    }
    case "beginGesture": {
      return {
        ...state,
        past: [...state.past, cloneMap(state.map)].slice(-80),
        future: [],
      };
    }
    case "move": {
      const topics = state.map.topics.map((t) =>
        t.id === action.id ? { ...t, x: action.x, y: action.y } : t,
      );
      const next = { ...state.map, topics };
      if (action.live) {
        return { ...state, map: touch(next), selectedId: action.id };
      }
      return pushHistory(state, next, action.id);
    }
    case "resize": {
      const width = clamp(action.width, MIN_NODE_W, MAX_NODE_W);
      const height = clamp(action.height, MIN_NODE_H, MAX_NODE_H);
      const topics = state.map.topics.map((t) =>
        t.id === action.id ? { ...t, width, height } : t,
      );
      const next = { ...state.map, topics };
      if (action.live) {
        return { ...state, map: touch(next), selectedId: action.id };
      }
      return pushHistory(state, next, action.id);
    }
    case "addChild": {
      if (state.map.topics.length >= MAX_TOPICS) return state;
      const parent = topicById(state.map, action.parentId);
      if (!parent) return state;
      const siblings = childrenOf(state.map, parent.id);
      const pos = placeChild(parent, siblings);
      const child = makeTopic({
        id: createId(),
        text: "New topic",
        x: pos.x,
        y: pos.y,
        parentId: parent.id,
      });
      return pushHistory(
        state,
        {
          ...state.map,
          topics: [...state.map.topics, child],
          links: [...state.map.links, treeLink(parent.id, child.id)],
        },
        child.id,
      );
    }
    case "addSibling": {
      if (state.map.topics.length >= MAX_TOPICS) return state;
      const node = topicById(state.map, action.nodeId);
      if (!node?.parentId) return state;
      return reduceEditor(state, { type: "addChild", parentId: node.parentId });
    }
    case "addFloating": {
      if (state.map.topics.length >= MAX_TOPICS) return state;
      const topic = makeTopic({
        id: createId(),
        text: "Loose topic",
        x: action.x,
        y: action.y,
        parentId: null,
      });
      return pushHistory(
        state,
        { ...state.map, topics: [...state.map.topics, topic] },
        topic.id,
      );
    }
    case "deleteSelected": {
      if (!state.selectedId) return state;
      const selected = topicById(state.map, state.selectedId);
      if (!selected) return state;
      const roots = state.map.topics.filter((t) => t.parentId === null);
      if (selected.parentId === null && roots.length === 1) {
        return state;
      }
      const remove = descendants(state.map, selected.id);
      const parentId = selected.parentId;
      return pushHistory(
        state,
        {
          ...state.map,
          topics: state.map.topics.filter((t) => !remove.has(t.id)),
          links: state.map.links.filter((l) => !remove.has(l.fromId) && !remove.has(l.toId)),
        },
        parentId,
      );
    }
    case "connect": {
      if (state.map.links.length >= MAX_LINKS) return state;
      if (action.fromId === action.toId) return state;
      if (!topicById(state.map, action.fromId) || !topicById(state.map, action.toId)) {
        return state;
      }
      if (hasLink(state.map, action.fromId, action.toId)) return state;
      const link: Link = { id: createId(), fromId: action.fromId, toId: action.toId };
      return pushHistory(
        state,
        { ...state.map, links: [...state.map.links, link] },
        action.toId,
      );
    }
    case "disconnect": {
      const links = state.map.links.filter((l) => l.id !== action.edgeId);
      if (links.length === state.map.links.length) return state;
      return pushHistory(state, { ...state.map, links }, state.selectedId);
    }
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        map: previous,
        selectedId: state.selectedId && previous.topics.some((t) => t.id === state.selectedId)
          ? state.selectedId
          : previous.topics[0]?.id ?? null,
        past: state.past.slice(0, -1),
        future: [cloneMap(state.map), ...state.future].slice(0, 80),
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        map: next,
        selectedId: state.selectedId && next.topics.some((t) => t.id === state.selectedId)
          ? state.selectedId
          : next.topics[0]?.id ?? null,
        past: [...state.past, cloneMap(state.map)].slice(-80),
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

export function mapBounds(map: MindMap, pad = 48): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  const xs = map.topics.flatMap((t) => [t.x, t.x + t.width]);
  const ys = map.topics.flatMap((t) => [t.y, t.y + t.height]);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}
