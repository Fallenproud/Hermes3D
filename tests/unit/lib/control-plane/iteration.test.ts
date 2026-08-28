import { describe, expect, it } from "vitest";
import { planIteration } from "../../../../../src/lib/control-plane/iteration";

const baseTask = {
  retry: {
    maxAttempts: 3,
    maxCost: 10,
    deadline: "2026-12-31T00:00:00.000Z",
    escalateToHuman: true,
  },
};

const gap = {
  recommendedAction: "iterate" as const,
  conflicts: [],
  missing: ["build"],
};

describe("planIteration", () => {
  it("allows a bounded repair attempt", () => {
    expect(planIteration(baseTask, gap, { attempt: 0, now: "2026-08-28T09:00:00.000Z" })).toMatchObject({
      allowed: true,
      attempt: 1,
      strategy: "repair",
      exhausted: false,
    });
  });

  it("stops and escalates after max attempts", () => {
    expect(planIteration(baseTask, gap, { attempt: 3, now: "2026-08-28T09:00:00.000Z" })).toMatchObject({
      allowed: false,
      attempt: 3,
      strategy: "human_review",
      exhausted: true,
    });
  });

  it("blocks iteration after the deadline", () => {
    expect(planIteration(baseTask, gap, { attempt: 0, now: "2027-01-01T00:00:00.000Z" })).toMatchObject({
      allowed: false,
      strategy: "human_review",
      deadlineExceeded: true,
    });
  });

  it("blocks iteration when estimated cost exceeds policy", () => {
    expect(planIteration(baseTask, gap, {
      attempt: 0,
      estimatedCost: 11,
      now: "2026-08-28T09:00:00.000Z",
    })).toMatchObject({
      allowed: false,
      strategy: "human_review",
      costExceeded: true,
    });
  });

  it("routes explicit human review without consuming an attempt", () => {
    expect(planIteration(baseTask, {
      recommendedAction: "human_review",
      conflicts: [],
      missing: [],
    }, { attempt: 1, now: "2026-08-28T09:00:00.000Z" })).toMatchObject({
      allowed: false,
      attempt: 1,
      strategy: "human_review",
    });
  });
});
