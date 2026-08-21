import { describe, expect, it } from "vitest";
import { createBlankMap, createEditorState, reduceEditor } from "./editor";
import { parseImportedFile, toExportedMap, validateMindMap } from "./validate";

describe("import validation and editor workflow", () => {
  it("round-trips a map through export JSON", () => {
    let state = createEditorState(createBlankMap("Round trip"));
    state = reduceEditor(state, { type: "addChild", parentId: state.selectedId! });
    state = reduceEditor(state, { type: "setText", id: state.selectedId!, text: "Child A" });
    const exported = toExportedMap(state.map);
    const parsed = parseImportedFile(JSON.stringify(exported));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.map.title).toBe("Round trip");
      expect(parsed.map.topics).toHaveLength(2);
      expect(parsed.map.topics.some((t) => t.text === "Child A")).toBe(true);
    }
  });

  it("rejects untrusted files without throwing", () => {
    expect(parseImportedFile("not json").ok).toBe(false);
    expect(parseImportedFile("{}").ok).toBe(false);
    expect(
      parseImportedFile(
        JSON.stringify({ format: "local-mind-map", version: 1, map: { id: "x" } }),
      ).ok,
    ).toBe(false);
    expect(validateMindMap(null).ok).toBe(false);
  });

  it("truncates overly long title and text", () => {
    const map = createBlankMap("x".repeat(500));
    map.topics[0]!.text = "y".repeat(5000);
    const result = validateMindMap(map);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.map.title.length).toBeLessThanOrEqual(120);
      expect(result.map.topics[0]!.text.length).toBeLessThanOrEqual(2000);
    }
  });

  it("undoes add-child after a later title change", () => {
    let state = createEditorState(createBlankMap("One"));
    state = reduceEditor(state, { type: "addChild", parentId: state.selectedId! });
    expect(state.map.topics).toHaveLength(2);
    state = reduceEditor(state, { type: "setTitle", title: "Two" });
    state = reduceEditor(state, { type: "undo" });
    expect(state.map.title).toBe("One");
    expect(state.map.topics).toHaveLength(2);
    state = reduceEditor(state, { type: "undo" });
    expect(state.map.topics).toHaveLength(1);
    state = reduceEditor(state, { type: "redo" });
    expect(state.map.topics).toHaveLength(2);
  });
});
