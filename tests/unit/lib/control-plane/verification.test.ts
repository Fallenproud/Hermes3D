import { describe, expect, it } from "vitest";
import { checksFromObservedEvidence, verifyTask } from "../../../../../src/lib/control-plane/verification";

const task = {
  taskId: "task-1",
  verification: {
    required: true,
    minimumConfidence: 0.8,
  },
};

describe("verifyTask", () => {
  it("passes when required checks pass above the confidence threshold", () => {
    const result = verifyTask(task, {
      verifierId: "qa-1",
      checks: [
        { id: "build", passed: true, required: true },
        { id: "tests", passed: true, required: true },
        { id: "docs", passed: false, required: false },
      ],
      evidence: ["build-log", "test-report"],
    });

    expect(result.passed).toBe(true);
    expect(result.confidence).toBeCloseTo(2 / 3);
  });

  it("fails when a required check fails", () => {
    const result = verifyTask(task, {
      verifierId: "qa-1",
      checks: [
        { id: "build", passed: true, required: true },
        { id: "tests", passed: false, required: true },
        { id: "docs", passed: true, required: false },
      ],
    });

    expect(result.passed).toBe(false);
  });

  it("fails an empty required verification", () => {
    expect(verifyTask(task, { verifierId: "qa-1", checks: [] }).passed).toBe(false);
  });
});

describe("checksFromObservedEvidence", () => {
  it("turns required evidence identifiers into explicit checks", () => {
    expect(checksFromObservedEvidence(["build", "tests"], [
      { id: "build", observed: true },
    ])).toEqual([
      expect.objectContaining({ id: "build", passed: true }),
      expect.objectContaining({ id: "tests", passed: false }),
    ]);
  });
});
