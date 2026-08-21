import { useCallback, useEffect, useState } from "react";
import { MapEditor } from "./components/MapEditor";
import { MapHome } from "./components/MapHome";
import { clearAllMaps, deleteMap, getMap, listMaps, saveMap } from "./db";
import { createBlankMap } from "./model/editor";
import { createSampleMap } from "./model/sample";
import { parseImportedFile } from "./model/validate";
import type { MapSummary, Theme } from "./types";

type Screen = { name: "home" } | { name: "editor"; mapId: string };

const appName = import.meta.env.VITE_APP_NAME || "Opensource Xmind";
const backupUrl = import.meta.env.VITE_BACKUP_URL?.trim() ?? "";

export function App() {
  const [dbState, setDbState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const rows = await listMaps();
    setMaps(rows);
  }, []);

  const boot = useCallback(async () => {
    setDbState("loading");
    setError(null);
    try {
      await refresh();
      setDbState("ready");
    } catch {
      setDbState("error");
      setError("This browser could not open local storage (IndexedDB). Private mode or blocked storage can cause this.");
    }
  }, [refresh]);

  useEffect(() => {
    void boot();
  }, [boot]);

  async function openNew(theme: Theme) {
    const map = createBlankMap("Untitled map", theme);
    await saveMap(map);
    await refresh();
    setScreen({ name: "editor", mapId: map.id });
    setNotice("Created a new private map on this device.");
  }

  async function loadSample() {
    const map = createSampleMap();
    await saveMap(map);
    await refresh();
    setScreen({ name: "editor", mapId: map.id });
    setNotice("Loaded labelled sample data. Delete it from the home list whenever you want.");
  }

  async function removeMap(id: string) {
    await deleteMap(id);
    await refresh();
    setNotice("Map deleted from this browser.");
  }

  async function wipeAll() {
    await clearAllMaps();
    await refresh();
    setScreen({ name: "home" });
    setNotice("All local maps were deleted.");
  }

  async function importFile(file: File) {
    const text = await file.text();
    const parsed = parseImportedFile(text);
    if (!parsed.ok) {
      setError(parsed.issues[0]?.message ?? "Could not import that file.");
      setNotice(null);
      return;
    }
    const imported = {
      ...parsed.map,
      id: crypto.randomUUID(),
      isSample: false,
      updatedAt: Date.now(),
    };
    await saveMap(imported);
    await refresh();
    setError(null);
    setScreen({ name: "editor", mapId: imported.id });
    setNotice("Import succeeded. The file was copied into local storage.");
  }

  if (dbState === "loading") {
    return (
      <div className="center-state" role="status" aria-live="polite">
        <p>Opening local storage…</p>
      </div>
    );
  }

  if (dbState === "error") {
    return (
      <div className="center-state">
        <div className="card" style={{ maxWidth: 480 }}>
          <h1>Local storage is unavailable</h1>
          <p className="banner banner-error">{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => void boot()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {screen.name === "home" ? (
        <MapHome
          appName={appName}
          backupUrl={backupUrl}
          maps={maps}
          error={error}
          notice={notice}
          onDismissError={() => setError(null)}
          onNew={(theme) => void openNew(theme)}
          onSample={() => void loadSample()}
          onOpen={(id) => {
            setNotice(null);
            setScreen({ name: "editor", mapId: id });
          }}
          onDelete={(id) => void removeMap(id)}
          onWipe={() => void wipeAll()}
          onImport={(file) => void importFile(file)}
        />
      ) : (
        <MapEditor
          appName={appName}
          mapId={screen.mapId}
          onBack={async () => {
            await refresh();
            setScreen({ name: "home" });
          }}
          loadMap={getMap}
          persistMap={saveMap}
        />
      )}
    </div>
  );
}
