import { describe, expect, it } from "vitest";
import { MAX_NODE_W, MIN_NODE_H } from "./constants";
import {
  createBlankMap,
  createEditorState,
  reduceEditor,
  type EditorState,
} from "./editor";

function child(state: EditorState): EditorState {
  const selected = state.selectedId;
  if (!selected) throw new Error("expected selection");
  return reduceEditor(state, { type: "addChild", parentId: selected });
}

describe("mind map data model", () => {
  it("creates a single central topic", () => {
    const map = createBlankMap("Test");
    expect(map.topics).toHaveLength(1);
    expect(map.links).toHaveLength(0);
    expect(map.topics[0]?.parentId).toBeNull();
    expect(map.title).toBe("Test");
  });

  it("adds a child topic and a tree link", () => {
    let state = createEditorState(createBlankMap());
    state = child(state);
    expect(state.map.topics).toHaveLength(2);
    expect(state.map.links).toHaveLength(1);
    const added = state.map.topics.find((t) => t.id === state.selectedId);
    expect(added?.parentId).toBe(state.map.topics[0]?.id);
    expect(added?.x).toBeGreaterThan(state.map.topics[0]!.x);
  });

  it("deletes a topic and its descendants, keeping the last root", () => {
    let state = createEditorState(createBlankMap());
    const rootId = state.map.topics[0]!.id;
    state = child(state);
    const branchId = state.selectedId!;
    state = child(state);
    expect(state.map.topics).toHaveLength(3);
    state = reduceEditor(state, { type: "select", id: branchId });
    state = reduceEditor(state, { type: "deleteSelected" });
    expect(state.map.topics).toHaveLength(1);
    expect(state.map.topics[0]?.id).toBe(rootId);
    expect(state.map.links).toHaveLength(0);

    state = reduceEditor(state, { type: "deleteSelected" });
    expect(state.map.topics).toHaveLength(1);
  });

  it("connects two topics once and ignores duplicates", () => {
    let state = createEditorState(createBlankMap());
    state = reduceEditor(state, {
      type: "addFloating",
      x: 400,
      y: 80,
    });
    const [a, b] = state.map.topics;
    state = reduceEditor(state, { type: "connect", fromId: a!.id, toId: b!.id });
    state = reduceEditor(state, { type: "connect", fromId: b!.id, toId: a!.id });
    expect(state.map.links).toHaveLength(1);
    state = reduceEditor(state, { type: "connect", fromId: a!.id, toId: a!.id });
    expect(state.map.links).toHaveLength(1);
  });

  it("clamps resize and records undo for discrete edits", () => {
    let state = createEditorState(createBlankMap());
    const id = state.map.topics[0]!.id;
    state = reduceEditor(state, { type: "resize", id, width: 9999, height: 1 });
    expect(state.map.topics[0]?.width).toBe(MAX_NODE_W);
    expect(state.map.topics[0]?.height).toBe(MIN_NODE_H);
    state = reduceEditor(state, { type: "undo" });
    expect(state.map.topics[0]?.width).toBeLessThan(MAX_NODE_W);
  });
});
