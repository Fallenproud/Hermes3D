import { describe, expect, it } from "vitest";
import {
  canTransition,
  createCanonicalTaskState,
  transitionTaskState,
} from "@/lib/control-plane/taskState";
import type { CanonicalTask } from "@/lib/control-plane/tasks";

const task: CanonicalTask = {
  taskId: "task-1",
  version: 99,
  goal: "test goal",
  intent: "test intent",
  source: "system",
  constraints: [],
  context: {},
  deliverables: [],
  acceptanceCriteria: [],
  expectedState: { description: "ready", assertions: [] },
  execution: {},
  risk: { score: 0 },
  confidence: { score: 1 },
  verification: { required: true },
  retry: { maxAttempts: 3 },
  evidence: [],
  status: "created",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("canonical task state", () => {
  it("initializes a canonical revision without mutating the source task", () => {
    const state = createCanonicalTaskState(task);

    expect(state.revision).toBe(1);
    expect(state.task.version).toBe(1);
    expect(state.task.status).toBe("created");
    expect(state.transitions).toEqual([]);
    expect(task.version).toBe(99);
  });

  it("allows only declared state transitions", () => {
    expect(canTransition("created", "planned")).toBe(true);
    expect(canTransition("created", "accepted")).toBe(false);
    expect(canTransition("accepted", "running")).toBe(false);
  });

  it("returns a new version and immutable transition history", () => {
    const initial = createCanonicalTaskState(task);
    const next = transitionTaskState(initial, "planned", {
      eventId: "evt-1",
      reason: "planner accepted the task",
      at: "2026-01-01T00:01:00.000Z",
    });

    expect(next).not.toBe(initial);
    expect(next.task.version).toBe(2);
    expect(next.revision).toBe(2);
    expect(next.task.status).toBe("planned");
    expect(next.transitions).toHaveLength(1);
    expect(next.transitions[0]).toMatchObject({
      from: "created",
      to: "planned",
      eventId: "evt-1",
    });
    expect(initial.task.status).toBe("created");
    expect(initial.transitions).toHaveLength(0);
  });

  it("rejects invalid transitions instead of silently changing truth", () => {
    const initial = createCanonicalTaskState(task);

    expect(() => transitionTaskState(initial, "accepted", {})).toThrow(
      "Invalid task transition: created -> accepted"
    );
  });
});
