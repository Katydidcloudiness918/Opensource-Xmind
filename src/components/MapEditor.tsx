import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { MindMap, Theme } from "../types";
import {
  createEditorState,
  reduceEditor,
  type EditorAction,
} from "../model/editor";
import { downloadBlob, mapToSvg, safeFilename, svgToPngBlob } from "../model/export";
import { toExportedMap } from "../model/validate";
import { Canvas } from "./Canvas";

type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  appName: string;
  mapId: string;
  onBack: () => Promise<void>;
  loadMap: (id: string) => Promise<MindMap | null>;
  persistMap: (map: MindMap) => Promise<void>;
};

export function MapEditor({ appName, mapId, onBack, loadMap, persistMap }: Props) {
  const [loadState, setLoadState] = useState<"loading" | "missing" | "ready">("loading");
  const [state, dispatch] = useReducer(reduceEditor, null, () =>
    createEditorState({
      id: mapId,
      title: "",
      isSample: false,
      createdAt: 0,
      updatedAt: 0,
      topics: [],
      links: [],
    }),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOk, setExportOk] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    void loadMap(mapId).then((map) => {
      if (cancelled) return;
      if (!map) {
        setLoadState("missing");
        return;
      }
      skipNextSave.current = true;
      dispatch({ type: "hydrate", map });
      setLoadState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [loadMap, mapId]);

  useEffect(() => {
    if (loadState !== "ready") return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setSaveState("saving");
    const handle = window.setTimeout(() => {
      void persistMap(state.map)
        .then(() => {
          setSaveState("saved");
          setSaveError(null);
        })
        .catch(() => {
          setSaveState("error");
          setSaveError("Autosave failed. Your latest edits may not be on disk.");
        });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [loadState, persistMap, state.map]);

  const selected = useMemo(
    () => state.map.topics.find((t) => t.id === state.selectedId) ?? null,
    [state.map.topics, state.selectedId],
  );

  const run = useCallback((action: EditorAction) => {
    dispatch(action);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (loadState !== "ready") return;
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea");
      if (event.key === "Escape") {
        setConnectFrom(null);
        target?.blur();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        run(event.shiftKey ? { type: "redo" } : { type: "undo" });
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        run({ type: "redo" });
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void persistMap(state.map).then(() => setSaveState("saved"));
        return;
      }
      if (editing) return;
      if (event.key === "Tab" && state.selectedId) {
        event.preventDefault();
        run({ type: "addChild", parentId: state.selectedId });
      } else if (event.key === "Enter" && state.selectedId) {
        event.preventDefault();
        run({ type: "addSibling", nodeId: state.selectedId });
      } else if ((event.key === "Delete" || event.key === "Backspace") && state.selectedId) {
        event.preventDefault();
        run({ type: "deleteSelected" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loadState, persistMap, run, state.map, state.selectedId]);

  async function exportJson() {
    try {
      const blob = new Blob([JSON.stringify(toExportedMap(state.map), null, 2)], {
        type: "application/json",
      });
      downloadBlob(safeFilename(state.map.title, "json"), blob);
      setExportError(null);
      setExportOk("JSON downloaded. Keep a copy outside this browser for backup.");
    } catch {
      setExportOk(null);
      setExportError("Could not export JSON.");
    }
  }

  async function exportSvg() {
    try {
      const svg = mapToSvg(state.map);
      downloadBlob(safeFilename(state.map.title, "svg"), new Blob([svg], { type: "image/svg+xml" }));
      setExportError(null);
      setExportOk("SVG downloaded.");
    } catch {
      setExportOk(null);
      setExportError("Could not export SVG.");
    }
  }

  async function exportPng() {
    try {
      const png = await svgToPngBlob(mapToSvg(state.map));
      downloadBlob(safeFilename(state.map.title, "png"), png);
      setExportError(null);
      setExportOk("PNG downloaded.");
    } catch {
      setExportOk(null);
      setExportError("Could not export PNG in this browser.");
    }
  }

  if (loadState === "loading") {
    return (
      <div className="center-state" role="status">
        <p>Loading map…</p>
      </div>
    );
  }

  if (loadState === "missing") {
    return (
      <div className="center-state">
        <div className="card">
          <h1>Map not found</h1>
          <p className="banner banner-error">It may have been deleted, or the local record is unreadable.</p>
          <button type="button" className="btn btn-primary" onClick={() => void onBack()}>
            Back to maps
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`editor theme-${state.map.theme || 'default'}`}>
      <header className="toolbar">
        <button type="button" className="btn" onClick={() => void onBack()}>
          All maps
        </button>
        <span className="muted">{appName}</span>
        <label className="sr-only" htmlFor="map-title">
          Map title
        </label>
        <input
          id="map-title"
          className="title-input"
          data-testid="map-title"
          value={state.map.title}
          maxLength={120}
          onChange={(e) => run({ type: "setTitle", title: e.target.value })}
        />
        <select
          className="btn"
          value={state.map.theme || "default"}
          onChange={(e) => run({ type: "setTheme", theme: e.target.value as Theme })}
          aria-label="Theme"
        >
          <option value="default">Default Theme</option>
          <option value="dark">Dark Theme</option>
          <option value="ocean">Ocean Theme</option>
          <option value="sunset">Sunset Theme</option>
        </select>
        <button type="button" className="btn" disabled={state.past.length === 0} onClick={() => run({ type: "undo" })}>
          Undo
        </button>
        <button type="button" className="btn" disabled={state.future.length === 0} onClick={() => run({ type: "redo" })}>
          Redo
        </button>
        <button
          type="button"
          className="btn"
          data-testid="add-child"
          disabled={!state.selectedId}
          onClick={() => state.selectedId && run({ type: "addChild", parentId: state.selectedId })}
        >
          Add child
        </button>
        <button
          type="button"
          className="btn"
          disabled={!selected?.parentId}
          onClick={() => selected && run({ type: "addSibling", nodeId: selected.id })}
        >
          Add sibling
        </button>
        <button type="button" className="btn" onClick={() => run({ type: "deleteSelected" })}>
          Delete topic
        </button>
        <button type="button" className="btn" data-testid="export-json" onClick={() => void exportJson()}>
          Export JSON
        </button>
        <button type="button" className="btn" onClick={() => void exportSvg()}>
          Export SVG
        </button>
        <button type="button" className="btn" onClick={() => void exportPng()}>
          Export PNG
        </button>
      </header>
      {(exportError || saveError) && (
        <div className="banner banner-error" role="alert" style={{ margin: "8px 16px 0" }}>
          {exportError ?? saveError}
        </div>
      )}
      {exportOk && (
        <div className="banner banner-ok" role="status" style={{ margin: "8px 16px 0" }}>
          {exportOk}
        </div>
      )}
      {connectFrom && (
        <div className="banner banner-warn" role="status" style={{ margin: "8px 16px 0" }}>
          Click a topic handle to finish the connection, or press Escape to cancel.
        </div>
      )}
      <Canvas
        map={state.map}
        selectedId={state.selectedId}
        connectFrom={connectFrom}
        onSelect={(id) => run({ type: "select", id })}
        onGestureStart={() => run({ type: "beginGesture" })}
        onMove={(id, x, y) => run({ type: "move", id, x, y, live: true })}
        onResize={(id, width, height) => run({ type: "resize", id, width, height, live: true })}
        onText={(id, text) => run({ type: "setText", id, text })}
        onConnect={(fromId, toId) => {
          run({ type: "connect", fromId, toId });
          setConnectFrom(null);
        }}
        onConnectStart={setConnectFrom}
        onDisconnect={(edgeId) => run({ type: "disconnect", edgeId })}
        onAddFloating={(x, y) => run({ type: "addFloating", x, y })}
      />
      <details className="help">
        <summary>Keyboard and mouse</summary>
        <p>
          <kbd>Tab</kbd> child · <kbd>Enter</kbd> sibling · <kbd>Delete</kbd> remove ·{" "}
          <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · drag a topic to move · corner squares to resize ·
          teal dots to connect · drag empty canvas to pan · wheel to zoom · double-click a topic
          to rename.
        </p>
      </details>
      <footer className="status">
        <span data-testid="save-status">
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved on this device"}
          {saveState === "error" && "Save failed"}
          {saveState === "idle" && "Local only"}
        </span>
        <span>
          {state.map.topics.length} topics · {state.map.links.length} links
        </span>
      </footer>
    </div>
  );
}
