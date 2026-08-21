import type { MindMap } from "../types";
import { mapBounds } from "./editor";

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapLines(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const maxChars = Math.max(8, Math.floor(width / 8));
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 8);
}

type ThemeColors = {
  canvasBg: string;
  topicBg: string;
  topicBorder: string;
  topicText: string;
  linkColor: string;
};

const THEME_COLORS: Record<string, ThemeColors> = {
  default: {
    canvasBg: "#f5f5f4",
    topicBg: "#ffffff",
    topicBorder: "#44403c",
    topicText: "#1c1917",
    linkColor: "#57534e",
  },
  dark: {
    canvasBg: "#1c1917",
    topicBg: "#292524",
    topicBorder: "#78716c",
    topicText: "#f5f5f4",
    linkColor: "#a8a29e",
  },
  ocean: {
    canvasBg: "#e0f2fe",
    topicBg: "#ffffff",
    topicBorder: "#0284c7",
    topicText: "#0c4a6e",
    linkColor: "#0369a1",
  },
  sunset: {
    canvasBg: "#fff7ed",
    topicBg: "#ffffff",
    topicBorder: "#ea580c",
    topicText: "#7c2d12",
    linkColor: "#c2410c",
  },
};

export function mapToSvg(map: MindMap): string {
  const colors = THEME_COLORS[map.theme ?? "default"] ?? THEME_COLORS["default"];
  const bounds = mapBounds(map, 56);
  const topics = map.topics
    .map((topic) => {
      const x = topic.x - bounds.minX;
      const y = topic.y - bounds.minY;
      const lines = wrapLines(topic.text || "Untitled", topic.width);
      const text = lines
        .map(
          (line, i) =>
            `<text x="${x + 12}" y="${y + 22 + i * 16}" fill="${colors.topicText}" font-size="14" font-family="Segoe UI, sans-serif">${escapeXml(line)}</text>`,
        )
        .join("");
      return `<g><rect x="${x}" y="${y}" width="${topic.width}" height="${topic.height}" rx="10" fill="${colors.topicBg}" stroke="${colors.topicBorder}" stroke-width="1.5"/>${text}</g>`;
    })
    .join("");

  const links = map.links
    .map((link) => {
      const from = map.topics.find((t) => t.id === link.fromId);
      const to = map.topics.find((t) => t.id === link.toId);
      if (!from || !to) return "";
      const x1 = from.x + from.width - bounds.minX;
      const y1 = from.y + from.height / 2 - bounds.minY;
      const x2 = to.x - bounds.minX;
      const y2 = to.y + to.height / 2 - bounds.minY;
      const mid = (x1 + x2) / 2;
      return `<path d="M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}" fill="none" stroke="${colors.linkColor}" stroke-width="2"/>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(bounds.width)}" height="${Math.ceil(bounds.height)}" viewBox="0 0 ${bounds.width} ${bounds.height}" role="img">
  <title>${escapeXml(map.title)}</title>
  <rect width="100%" height="100%" fill="${colors.canvasBg}"/>
  ${links}
  ${topics}
</svg>`;
}


export async function svgToPngBlob(svg: string): Promise<Blob> {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not rasterize SVG."));
    });
    image.src = url;
    const img = await loaded;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, img.naturalWidth);
    canvas.height = Math.max(1, img.naturalHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.fillStyle = "#f5f5f4";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("PNG export failed."));
      }, "image/png");
    });
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(title: string, ext: string): string {
  const base = title.replace(/[^\w\- ]+/g, "").trim().slice(0, 40) || "mind-map";
  return `${base}.${ext}`;
}
