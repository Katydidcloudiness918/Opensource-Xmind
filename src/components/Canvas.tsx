import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { MindMap } from "../types";

type Props = {
  map: MindMap;
  selectedId: string | null;
  connectFrom: string | null;
  onSelect: (id: string | null) => void;
  onGestureStart: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onText: (id: string, text: string) => void;
  onConnect: (fromId: string, toId: string) => void;
  onConnectStart: (id: string | null) => void;
  onDisconnect: (edgeId: string) => void;
  onAddFloating: (x: number, y: number) => void;
};

export function Canvas({
  map,
  selectedId,
  connectFrom,
  onSelect,
  onGestureStart,
  onMove,
  onResize,
  onText,
  onConnect,
  onConnectStart,
  onDisconnect,
  onAddFloating,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spacePan, setSpacePan] = useState(false);
  const lastDownId = useRef<string | null>(null);
  const drag = useRef<{
    kind: "pan" | "move" | "resize";
    id?: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW?: number;
    origH?: number;
    history?: boolean;
  } | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !editingId) {
        if (e.target === document.body || (e.target as HTMLElement).tagName === "DIV") {
          e.preventDefault();
          setSpacePan(true);
        }
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        setSpacePan(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [editingId]);

  function toWorld(clientX: number, clientY: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }

  function onPointerDownCanvas(event: PointerEvent<HTMLDivElement>, bypassTargetCheck = false) {
    if (!bypassTargetCheck && event.target !== event.currentTarget) return;
    lastDownId.current = 'canvas';
    onSelect(null);
    setEditingId(null);
    drag.current = {
      kind: "pan",
      startX: event.clientX,
      startY: event.clientY,
      origX: pan.x,
      origY: pan.y,
    };
    wrapRef.current?.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;
    if (d.kind === "pan") {
      setPan({ x: d.origX + dx, y: d.origY + dy });
    } else if (d.kind === "move" && d.id) {
      if (!d.history) {
        onGestureStart();
        d.history = true;
      }
      onMove(d.id, d.origX + dx / zoom, d.origY + dy / zoom);
    } else if (d.kind === "resize" && d.id && d.origW && d.origH) {
      if (!d.history) {
        onGestureStart();
        d.history = true;
      }
      onResize(d.id, d.origW + dx / zoom, d.origH + dy / zoom);
    }
  }

  function endDrag() {
    drag.current = null;
  }

  function startMove(event: PointerEvent, id: string, x: number, y: number) {
    if (spacePan) {
      lastDownId.current = 'canvas';
      onPointerDownCanvas(event as unknown as PointerEvent<HTMLDivElement>, true);
      return;
    }
    lastDownId.current = id;
    event.stopPropagation();
    onSelect(id);
    wrapRef.current?.setPointerCapture(event.pointerId);
    drag.current = {
      kind: "move",
      id,
      startX: event.clientX,
      startY: event.clientY,
      origX: x,
      origY: y,
    };
  }

  function startResize(event: PointerEvent, id: string, w: number, h: number) {
    event.stopPropagation();
    onSelect(id);
    wrapRef.current?.setPointerCapture(event.pointerId);
    drag.current = {
      kind: "resize",
      id,
      startX: event.clientX,
      startY: event.clientY,
      origX: 0,
      origY: 0,
      origW: w,
      origH: h,
    };
  }

  function handlePort(event: MouseEvent, id: string) {
    event.stopPropagation();
    if (connectFrom && connectFrom !== id) {
      onConnect(connectFrom, id);
      return;
    }
    onConnectStart(id);
  }

  return (
    <div
      ref={wrapRef}
      className="canvas-wrap"
      data-testid="canvas"
      style={{ cursor: spacePan ? (drag.current ? "grabbing" : "grab") : "default" }}
      onPointerDown={onPointerDownCanvas}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={(event) => {
        event.preventDefault();
        const next = Math.min(2.2, Math.max(0.35, zoom + (event.deltaY > 0 ? -0.08 : 0.08)));
        setZoom(next);
      }}
      onDoubleClick={(event) => {
        if (lastDownId.current !== 'canvas') {
          if (lastDownId.current) setEditingId(lastDownId.current);
          return;
        }
        if (event.target !== event.currentTarget) return;
        const pt = toWorld(event.clientX, event.clientY);
        onAddFloating(pt.x, pt.y);
      }}
    >
      <div className="world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <svg className="links" width="4000" height="3000" aria-hidden="true">
          {map.links.map((link) => {
            const from = map.topics.find((t) => t.id === link.fromId);
            const to = map.topics.find((t) => t.id === link.toId);
            if (!from || !to) return null;
            const x1 = from.x + from.width;
            const y1 = from.y + from.height / 2;
            const x2 = to.x;
            const y2 = to.y + to.height / 2;
            const mid = (x1 + x2) / 2;
            return (
              <path
                key={link.id}
                d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="#57534e"
                strokeWidth="2"
                onClick={(e) => {
                  e.stopPropagation();
                  onDisconnect(link.id);
                }}
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
              />
            );
          })}
        </svg>
        {map.topics.map((topic) => {
          const selected = topic.id === selectedId;
          return (
            <div
              key={topic.id}
              className={`${selected ? "topic selected" : "topic"}${connectFrom === topic.id ? " connecting" : ""}`}
              data-testid="topic"
              role="button"
              tabIndex={selected ? 0 : -1}
              aria-pressed={selected}
              aria-label={topic.text || "Untitled topic"}
              style={{
                left: topic.x,
                top: topic.y,
                width: topic.width,
                height: topic.height,
              }}
              onPointerDown={(e) => startMove(e, topic.id, topic.x, topic.y)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingId(topic.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(topic.id);
              }}
            >
              {editingId === topic.id ? (
                <input
                  className="topic-edit"
                  aria-label="Topic text"
                  value={topic.text}
                  maxLength={2000}
                  autoFocus
                  onChange={(e) => onText(topic.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              ) : (
                <span>{topic.text || "Untitled"}</span>
              )}
              <button
                type="button"
                className="handle handle-left"
                aria-label={`Connect from left of ${topic.text}`}
                onClick={(e) => handlePort(e, topic.id)}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                className="handle handle-right"
                aria-label={`Connect from right of ${topic.text}`}
                onClick={(e) => handlePort(e, topic.id)}
                onPointerDown={(e) => e.stopPropagation()}
              />
              {selected ? (
                <button
                  type="button"
                  className="resize resize-se"
                  aria-label="Resize topic"
                  onPointerDown={(e) => startResize(e, topic.id, topic.width, topic.height)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
