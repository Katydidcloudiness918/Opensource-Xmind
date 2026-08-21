import { useState } from "react";
import type { MapSummary, Theme } from "../types";

type Props = {
  appName: string;
  backupUrl: string;
  maps: MapSummary[];
  error: string | null;
  notice: string | null;
  onDismissError: () => void;
  onNew: (theme: Theme) => void;
  onSample: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onWipe: () => void;
  onImport: (file: File) => void;
};

export function MapHome({
  appName,
  backupUrl,
  maps,
  error,
  notice,
  onDismissError,
  onNew,
  onSample,
  onOpen,
  onDelete,
  onWipe,
  onImport,
}: Props) {
  const [newTheme, setNewTheme] = useState<Theme>("default");

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="brand">{appName}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Private, single-user mind maps stored in this browser.
          </p>
        </div>
      </header>
      <main id="main" className="page">
        <section className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <select
              className="btn"
              value={newTheme}
              onChange={(e) => setNewTheme(e.target.value as Theme)}
              aria-label="New map theme"
            >
              <option value="default">Default Theme</option>
              <option value="dark">Dark Theme</option>
              <option value="ocean">Ocean Theme</option>
              <option value="sunset">Sunset Theme</option>
            </select>
            <button type="button" className="btn btn-primary" data-testid="new-map" onClick={() => onNew(newTheme)}>
              New map
            </button>
            <button type="button" className="btn" data-testid="load-sample" onClick={onSample}>
              Load sample map
            </button>
            <label className="btn">
              Import JSON
              <input
                className="sr-only"
                type="file"
                accept="application/json,.json"
                data-testid="import-file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onImport(file);
                }}
              />
            </label>
          </div>
          {error ? (
            <div className="banner banner-error" role="alert">
              {error}{" "}
              <button type="button" className="btn" onClick={onDismissError}>
                Dismiss
              </button>
            </div>
          ) : null}
          {notice ? (
            <div className="banner banner-ok" role="status">
              {notice}
            </div>
          ) : null}
          {backupUrl ? (
            <p className="banner banner-warn">
              A backup URL is configured, but this build does not upload maps. Everything still
              saves locally.
            </p>
          ) : (
            <p className="muted">
              Optional remote backup is off. Leave <code>VITE_BACKUP_URL</code> empty to stay fully
              offline.
            </p>
          )}
          {maps.length === 0 ? (
            <div className="center-state" style={{ minHeight: 180 }} data-testid="empty-maps">
              <div>
                <h2>No maps yet</h2>
                <p className="muted">Create a map or load the labelled sample. Nothing leaves this device.</p>
              </div>
            </div>
          ) : (
            <ul className="map-list" aria-label="Saved maps">
              {maps.map((map) => (
                <li key={map.id}>
                  <div>
                    <strong>{map.title}</strong>
                    {map.isSample ? <span className="sample-tag">SAMPLE</span> : null}
                    <div className="muted">
                      {map.topicCount} topics · updated {new Date(map.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="row">
                    <button type="button" className="btn btn-primary" onClick={() => onOpen(map.id)}>
                      Open
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      data-testid={map.isSample ? "delete-sample" : undefined}
                      onClick={() => onDelete(map.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {maps.length > 0 ? (
            <p style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-danger" onClick={onWipe}>
                Delete all local maps
              </button>
            </p>
          ) : null}
        </section>
      </main>
    </>
  );
}
