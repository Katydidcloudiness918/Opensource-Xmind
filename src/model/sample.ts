import type { MindMap } from "../types";
import { SAMPLE_TITLE_PREFIX } from "./constants";
import { createId, now } from "./ids";

export function createSampleMap(): MindMap {
  const rootId = createId();
  const roomsId = createId();
  const budgetId = createId();
  const kitchenId = createId();
  const bathId = createId();
  const timestamp = now();

  return {
    id: createId(),
    title: `${SAMPLE_TITLE_PREFIX} Home renovation — delete anytime`,
    isSample: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    topics: [
      {
        id: rootId,
        text: "Home renovation",
        x: 80,
        y: 200,
        width: 188,
        height: 52,
        parentId: null,
      },
      {
        id: roomsId,
        text: "Rooms",
        x: 360,
        y: 120,
        width: 140,
        height: 44,
        parentId: rootId,
      },
      {
        id: kitchenId,
        text: "Kitchen",
        x: 580,
        y: 72,
        width: 140,
        height: 44,
        parentId: roomsId,
      },
      {
        id: bathId,
        text: "Bathroom",
        x: 580,
        y: 148,
        width: 140,
        height: 44,
        parentId: roomsId,
      },
      {
        id: budgetId,
        text: "Budget cap $12k (sample)",
        x: 360,
        y: 280,
        width: 220,
        height: 44,
        parentId: rootId,
      },
    ],
    links: [
      { id: createId(), fromId: rootId, toId: roomsId },
      { id: createId(), fromId: roomsId, toId: kitchenId },
      { id: createId(), fromId: roomsId, toId: bathId },
      { id: createId(), fromId: rootId, toId: budgetId },
    ],
  };
}
