/**
 * Deterministic reconciliation for canonical task state.
 *
 * This layer compares the task's explicit expected-state assertions with
 * observed assertions. It does not use an LLM or infer success from a
 * runtime-reported status.
 */

import type { CanonicalTask, ExpectedState } from "./tasks";

export type ObservedAssertion = {
  id: string;
  observed: unknown;
  source?: string;
  evidenceIds?: string[];
};

export type ReconciliationAction =
  | "accept"
  | "iterate"
  | "replan"
  | "human_review"
  | "reject";

export type ReconciliationResult = {
  taskId: string;
  expectedVersion: number;
  observedVersion: number;
  match: boolean;
  distance: number;
  confidence: number;
  missing: string[];
  unexpected: string[];
  conflicts: string[];
  recommendedAction: ReconciliationAction;
};

function equalValue(expected: unknown, observed: unknown): boolean {
  if (Object.is(expected, observed)) return true;

  try {
    return JSON.stringify(expected) === JSON.stringify(observed);
  } catch {
    return false;
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function reconcileTask(
  task: Pick<CanonicalTask, "taskId" | "version" | "expectedState" | "verification">,
  observed: readonly ObservedAssertion[],
  observedVersion = 1,
): ReconciliationResult {
  const expected: ExpectedState = task.expectedState;
  const observedById = new Map(observed.map((item) => [item.id, item]));

  const missing: string[] = [];
  const conflicts: string[] = [];

  for (const assertion of expected.assertions) {
    const actual = observedById.get(assertion.id);

    if (!actual) {
      missing.push(assertion.id);
      continue;
    }

    if (!equalValue(assertion.expected, actual.observed)) {
      conflicts.push(assertion.id);
    }
  }

  const expectedIds = new Set(expected.assertions.map((assertion) => assertion.id));
  const unexpected = observed
    .filter((assertion) => !expectedIds.has(assertion.id))
    .map((assertion) => assertion.id);

  const totalChecks = Math.max(expected.assertions.length, 1);
  const satisfied = expected.assertions.length - missing.length - conflicts.length;
  const distance = clamp(
    (missing.length + conflicts.length + unexpected.length * 0.5) / totalChecks,
  );
  const confidence = clamp(satisfied / totalChecks);
  const match = missing.length === 0 && conflicts.length === 0;

  let recommendedAction: ReconciliationAction;
  if (match) {
    const minimumConfidence = task.verification.minimumConfidence ?? 0;
    recommendedAction = confidence >= minimumConfidence ? "accept" : "human_review";
  } else if (conflicts.length > 0) {
    recommendedAction = "iterate";
  } else if (missing.length > 0) {
    recommendedAction = "iterate";
  } else {
    recommendedAction = "human_review";
  }

  return {
    taskId: task.taskId,
    expectedVersion: task.version,
    observedVersion,
    match,
    distance,
    confidence,
    missing,
    unexpected,
    conflicts,
    recommendedAction,
  };
}
