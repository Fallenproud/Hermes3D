/**
 * Bounded iteration planning for reconciliation gaps.
 *
 * This layer is deliberately policy-driven and side-effect free. It decides
 * whether another attempt is permitted and describes the next action; it
 * does not execute agents or mutate canonical task state.
 */

import type { CanonicalTask, RetryPolicy } from "./tasks";
import type { ReconciliationResult } from "./reconciliation";

export type IterationReason =
  | "reconciliation_gap"
  | "verification_failure"
  | "manual_retry";

export type IterationDecision = {
  allowed: boolean;
  attempt: number;
  reason: IterationReason;
  strategy: "repair" | "replan" | "human_review" | "stop";
  exhausted: boolean;
  deadlineExceeded: boolean;
  costExceeded: boolean;
};

export type IterationContext = {
  attempt: number;
  estimatedCost?: number;
  now?: string;
};

function isDeadlineExceeded(deadline: string | undefined, now: string): boolean {
  if (!deadline) return false;
  const deadlineMs = Date.parse(deadline);
  const nowMs = Date.parse(now);
  return Number.isFinite(deadlineMs) && Number.isFinite(nowMs) && nowMs >= deadlineMs;
}

function isCostExceeded(policy: RetryPolicy, estimatedCost: number | undefined): boolean {
  return policy.maxCost !== undefined && estimatedCost !== undefined
    ? estimatedCost > policy.maxCost
    : false;
}

export function planIteration(
  task: Pick<CanonicalTask, "retry">,
  reconciliation: Pick<ReconciliationResult, "recommendedAction" | "conflicts" | "missing">,
  context: IterationContext,
): IterationDecision {
  const policy = task.retry;
  const now = context.now ?? new Date().toISOString();
  const nextAttempt = context.attempt + 1;
  const exhausted = nextAttempt > policy.maxAttempts;
  const deadlineExceeded = isDeadlineExceeded(policy.deadline, now);
  const costExceeded = isCostExceeded(policy, context.estimatedCost);

  if (exhausted || deadlineExceeded || costExceeded) {
    return {
      allowed: false,
      attempt: context.attempt,
      reason: "reconciliation_gap",
      strategy: policy.escalateToHuman ? "human_review" : "stop",
      exhausted,
      deadlineExceeded,
      costExceeded,
    };
  }

  if (reconciliation.recommendedAction === "human_review") {
    return {
      allowed: false,
      attempt: context.attempt,
      reason: "reconciliation_gap",
      strategy: "human_review",
      exhausted,
      deadlineExceeded,
      costExceeded,
    };
  }

  const strategy = reconciliation.recommendedAction === "replan"
    ? "replan"
    : reconciliation.conflicts.length > 0
      ? "repair"
      : reconciliation.missing.length > 0
        ? "repair"
        : "replan";

  return {
    allowed: true,
    attempt: nextAttempt,
    reason: "reconciliation_gap",
    strategy,
    exhausted,
    deadlineExceeded,
    costExceeded,
  };
}
