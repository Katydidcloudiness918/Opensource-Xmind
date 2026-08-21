import type { ExportedMap, Link, MindMap, Topic } from "../types";
import { FILE_FORMAT, FILE_VERSION } from "../types";
import {
  MAX_LINKS,
  MAX_TEXT,
  MAX_TITLE,
  MAX_TOPICS,
  MAX_NODE_H,
  MAX_NODE_W,
  MIN_NODE_H,
  MIN_NODE_W,
} from "./constants";

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult =
  | { ok: true; map: MindMap }
  | { ok: false; issues: ValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function sanitizeText(text: string, max: number): string {
  return text.replace(/\0/g, "").slice(0, max);
}

function validateTopic(raw: unknown, index: number, ids: Set<string>): Topic | ValidationIssue {
  if (!isRecord(raw)) {
    return { path: `topics[${index}]`, message: "Topic must be an object." };
  }
  const id = asString(raw.id);
  if (!id || id.length > 80) {
    return { path: `topics[${index}].id`, message: "Topic id is missing or too long." };
  }
  if (ids.has(id)) {
    return { path: `topics[${index}].id`, message: "Duplicate topic id." };
  }
  const text = asString(raw.text);
  if (text === null) {
    return { path: `topics[${index}].text`, message: "Topic text must be a string." };
  }
  const x = asFiniteNumber(raw.x);
  const y = asFiniteNumber(raw.y);
  const width = asFiniteNumber(raw.width);
  const height = asFiniteNumber(raw.height);
  if (x === null || y === null || width === null || height === null) {
    return { path: `topics[${index}]`, message: "Topic position and size must be finite numbers." };
  }
  let parentId: string | null = null;
  if (raw.parentId !== null && raw.parentId !== undefined) {
    const p = asString(raw.parentId);
    if (!p) {
      return { path: `topics[${index}].parentId`, message: "parentId must be a string or null." };
    }
    parentId = p;
  }
  ids.add(id);
  return {
    id,
    text: sanitizeText(text, MAX_TEXT),
    x,
    y,
    width: Math.min(MAX_NODE_W, Math.max(MIN_NODE_W, width)),
    height: Math.min(MAX_NODE_H, Math.max(MIN_NODE_H, height)),
    parentId,
  };
}

export function validateMindMap(raw: unknown): ValidationResult {
  if (!isRecord(raw)) {
    return { ok: false, issues: [{ path: "", message: "Map must be an object." }] };
  }
  const issues: ValidationIssue[] = [];
  const id = asString(raw.id);
  if (!id || id.length > 80) {
    issues.push({ path: "id", message: "Map id is missing or too long." });
  }
  const titleRaw = asString(raw.title);
  if (titleRaw === null) {
    issues.push({ path: "title", message: "Title must be a string." });
  }
  if (!Array.isArray(raw.topics)) {
    issues.push({ path: "topics", message: "topics must be an array." });
  }
  if (!Array.isArray(raw.links)) {
    issues.push({ path: "links", message: "links must be an array." });
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const topicsRaw = raw.topics as unknown[];
  const linksRaw = raw.links as unknown[];
  if (topicsRaw.length === 0) {
    return { ok: false, issues: [{ path: "topics", message: "A map needs at least one topic." }] };
  }
  if (topicsRaw.length > MAX_TOPICS) {
    return {
      ok: false,
      issues: [{ path: "topics", message: `Too many topics (max ${MAX_TOPICS}).` }],
    };
  }
  if (linksRaw.length > MAX_LINKS) {
    return {
      ok: false,
      issues: [{ path: "links", message: `Too many links (max ${MAX_LINKS}).` }],
    };
  }

  const ids = new Set<string>();
  const topics: Topic[] = [];
  for (let i = 0; i < topicsRaw.length; i += 1) {
    const result = validateTopic(topicsRaw[i], i, ids);
    if ("message" in result) {
      return { ok: false, issues: [result] };
    }
    topics.push(result);
  }

  for (const topic of topics) {
    if (topic.parentId && !ids.has(topic.parentId)) {
      return {
        ok: false,
        issues: [{ path: "topics", message: "A topic points at a missing parent." }],
      };
    }
    if (topic.parentId === topic.id) {
      return {
        ok: false,
        issues: [{ path: "topics", message: "A topic cannot be its own parent." }],
      };
    }
  }

  const links: Link[] = [];
  const seenLinks = new Set<string>();
  for (let i = 0; i < linksRaw.length; i += 1) {
    const item = linksRaw[i];
    if (!isRecord(item)) {
      return { ok: false, issues: [{ path: `links[${i}]`, message: "Link must be an object." }] };
    }
    const linkId = asString(item.id);
    const fromId = asString(item.fromId);
    const toId = asString(item.toId);
    if (!linkId || !fromId || !toId) {
      return {
        ok: false,
        issues: [{ path: `links[${i}]`, message: "Link id, fromId, and toId are required." }],
      };
    }
    if (!ids.has(fromId) || !ids.has(toId)) {
      return {
        ok: false,
        issues: [{ path: `links[${i}]`, message: "Link refers to a missing topic." }],
      };
    }
    if (fromId === toId) {
      return {
        ok: false,
        issues: [{ path: `links[${i}]`, message: "A topic cannot link to itself." }],
      };
    }
    const key = [fromId, toId].sort().join(">");
    if (seenLinks.has(key)) {
      continue;
    }
    seenLinks.add(key);
    links.push({ id: linkId.slice(0, 80), fromId, toId });
  }

  const createdAt = asFiniteNumber(raw.createdAt) ?? Date.now();
  const updatedAt = asFiniteNumber(raw.updatedAt) ?? createdAt;
  const map: MindMap = {
    id: id as string,
    title: sanitizeText(titleRaw as string, MAX_TITLE) || "Untitled map",
    isSample: raw.isSample === true,
    createdAt,
    updatedAt,
    topics,
    links,
  };
  return { ok: true, map };
}

export function parseImportedFile(rawText: string): ValidationResult {
  if (rawText.length > 2_000_000) {
    return { ok: false, issues: [{ path: "", message: "File is too large to import." }] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    return { ok: false, issues: [{ path: "", message: "File is not valid JSON." }] };
  }
  if (!isRecord(parsed)) {
    return { ok: false, issues: [{ path: "", message: "File root must be an object." }] };
  }
  if (parsed.format !== FILE_FORMAT) {
    return {
      ok: false,
      issues: [{ path: "format", message: "This is not a Local Mind Map file." }],
    };
  }
  const version = asFiniteNumber(parsed.version);
  if (version !== FILE_VERSION) {
    return {
      ok: false,
      issues: [{ path: "version", message: "Unsupported file version." }],
    };
  }
  return validateMindMap(parsed.map);
}

export function toExportedMap(map: MindMap): ExportedMap {
  return { format: FILE_FORMAT, version: FILE_VERSION, map };
}
