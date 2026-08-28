import { describe, expect, it } from "vitest";

import { reconcileTask, type ObservedAssertion } from "@/lib/control-plane/reconciliation";
import type { CanonicalTask } from "@/lib/control-plane/tasks";

const task = (overrides: Partial<CanonicalTask> = {}): CanonicalTask => ({
  taskId: "task-1",
  version: 3,
  goal: "Deploy the service",
  intent: "deployment",
  source: "system",
  constraints: [],
  context: {},
  deliverables: [],
  acceptanceCriteria: [],
  expectedState: {
    description: "Deployment is healthy",
    assertions: [
      { id: "service.ready", description: "Service is ready", expected: true },
      { id: "build.passed", description: "Build passed", expected: true },
    ],
  },
  execution: {},
  risk: { score: 0 },
  confidence: { score: 1 },
  verification: { required: true, minimumConfidence: 1 },
  retry: { maxAttempts: 2 },
  evidence: [],
  status: "reconciling",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
  ...overrides,
});

describe("reconcileTask", () => {
  it("accepts when every expected assertion matches", () => {
    const observed: ObservedAssertion[] = [
      { id: "service.ready", observed: true },
      { id: "build.passed", observed: true },
    ];

    expect(reconcileTask(task(), observed, 7)).toEqual({
      taskId: "task-1",
      expectedVersion: 3,
      observedVersion: 7,
      match: true,
      distance: 0,
      confidence: 1,
      missing: [],
      unexpected: [],
      conflicts: [],
      recommendedAction: "accept",
    });
  });

  it("classifies missing and conflicting assertions as a deterministic gap", () => {
    const observed: ObservedAssertion[] = [
      { id: "service.ready", observed: false },
    ];

    const result = reconcileTask(task(), observed);

    expect(result.match).toBe(false);
    expect(result.missing).toEqual(["build.passed"]);
    expect(result.conflicts).toEqual(["service.ready"]);
    expect(result.distance).toBe(1);
    expect(result.confidence).toBe(0);
    expect(result.recommendedAction).toBe("iterate");
  });

  it("keeps unknown observations separate from expected assertions", () => {
    const observed: ObservedAssertion[] = [
      { id: "service.ready", observed: true },
      { id: "build.passed", observed: true },
      { id: "debug.log", observed: "extra" },
    ];

    const result = reconcileTask(task(), observed);

    expect(result.match).toBe(true);
    expect(result.unexpected).toEqual(["debug.log"]);
    expect(result.confidence).toBe(1);
    expect(result.distance).toBe(0.25);
    expect(result.recommendedAction).toBe("accept");
  });

  it("uses the verification confidence threshold before accepting", () => {
    const result = reconcileTask(
      task({ verification: { required: true, minimumConfidence: 1.1 } }),
      [
        { id: "service.ready", observed: true },
        { id: "build.passed", observed: true },
      ],
    );

    expect(result.match).toBe(true);
    expect(result.confidence).toBe(1);
    expect(result.recommendedAction).toBe("human_review");
  });
});
