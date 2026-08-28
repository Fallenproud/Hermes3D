/**
 * Canonical event envelope.
 *
 * Events are transport-neutral. Runtime-specific events should be normalized
 * into this shape at the adapter boundary.
 */

export type CanonicalEventType =
  | "task.created"
  | "task.planned"
  | "task.assigned"
  | "task.started"
  | "task.progress"
  | "task.observed"
  | "task.reconciled"
  | "task.mismatch"
  | "task.iteration.started"
  | "task.verification.started"
  | "task.verification.failed"
  | "task.accepted"
  | "task.rejected"
  | "agent.message"
  | "agent.handoff"
  | "agent.progress"
  | "agent.artifact";

export type CanonicalEvent<TPayload = unknown> = {
  eventId: string;
  eventType: CanonicalEventType;

  taskId?: string;
  runId?: string;
  agentId?: string;

  source: string;
  timestamp: string;
  sequence?: number;

  payload: TPayload;

  correlationId: string;
  causationId?: string;

  schemaVersion: 1;
};
