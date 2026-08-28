/**
 * Deterministic verification for canonical task acceptance.
 *
 * Verification consumes explicit checks and evidence. It never treats an
 * agent/runtime completion signal as proof of correctness.
 */

import type { CanonicalTask, VerificationPolicy } from "./tasks";
import type { ObservedAssertion } from "./reconciliation";

export type VerificationCheck = {
  id: string;
  passed: boolean;
  required: boolean;
  detail?: string;
  evidenceIds?: string[];
};

export type VerificationResult = {
  taskId: string;
  verifierId: string;
  passed: boolean;
  confidence: number;
  checks: VerificationCheck[];
  evidence: string[];
};

export type VerificationInput = {
  verifierId: string;
  checks: readonly VerificationCheck[];
  evidence?: readonly string[];
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function verifyTask(
  task: Pick<CanonicalTask, "taskId" | "verification">,
  input: VerificationInput,
): VerificationResult {
  const policy: VerificationPolicy = task.verification;
  const checks = [...input.checks];
  const requiredChecks = checks.filter((check) => check.required);
  const requiredPassed = requiredChecks.every((check) => check.passed);
  const passedCount = checks.filter((check) => check.passed).length;
  const confidence = checks.length === 0 ? 0 : clamp(passedCount / checks.length);
  const minimumConfidence = policy.minimumConfidence ?? 0;

  const passed = policy.required
    ? requiredPassed && confidence >= minimumConfidence
    : confidence >= minimumConfidence;

  return {
    taskId: task.taskId,
    verifierId: input.verifierId,
    passed,
    confidence,
    checks,
    evidence: [...(input.evidence ?? [])],
  };
}

export function checksFromObservedEvidence(
  requiredIds: readonly string[],
  observed: readonly ObservedAssertion[],
): VerificationCheck[] {
  const observedIds = new Set(observed.map((item) => item.id));

  return requiredIds.map((id) => ({
    id,
    required: true,
    passed: observedIds.has(id),
    detail: observedIds.has(id) ? "Observed evidence present" : "Required evidence missing",
    evidenceIds: observedIds.has(id) ? [id] : [],
  }));
}
