/**
 * Versioned canonical task state.
 *
 * State transitions are explicit and immutable. The latest state is a
 * projection of an append-only transition history; runtime/UI projections
 * must not mutate this state directly.
 */

import type { CanonicalTask, TaskStatus } from "./tasks";

export type TaskStateTransition = {
  from: TaskStatus;
  to: TaskStatus;
  reason?: string;
  eventId?: string;
  causationId?: string;
  at: string;
};

export type CanonicalTaskState = {
  task: CanonicalTask;
  revision: number;
  transitions: readonly TaskStateTransition[];
};

const ALLOWED_TRANSITIONS: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
  created: ["planned", "cancelled", "blocked"],
  planned: ["assigned", "cancelled", "blocked"],
  assigned: ["running", "cancelled", "blocked"],
  running: ["reconciling", "blocked", "cancelled"],
  reconciling: ["verifying", "iterating", "rejected", "blocked"],
  iterating: ["planned", "assigned", "running", "blocked", "cancelled"],
  verifying: ["accepted", "rejected", "iterating", "blocked"],
  accepted: [],
  rejected: ["iterating", "cancelled"],
  blocked: ["planned", "cancelled"],
  cancelled: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function createCanonicalTaskState(task: CanonicalTask): CanonicalTaskState {
  return {
    task: { ...task, version: 1 },
    revision: 1,
    transitions: [],
  };
}

export function transitionTaskState(
  state: CanonicalTaskState,
  to: TaskStatus,
  metadata: Omit<TaskStateTransition, "from" | "to" | "at"> & { at?: string },
): CanonicalTaskState {
  const from = state.task.status;

  if (!canTransition(from, to)) {
    throw new Error(`Invalid task transition: ${from} -> ${to}`);
  }

  const at = metadata.at ?? new Date().toISOString();
  const transition: TaskStateTransition = {
    from,
    to,
    at,
    reason: metadata.reason,
    eventId: metadata.eventId,
    causationId: metadata.causationId,
  };

  const nextTask: CanonicalTask = {
    ...state.task,
    status: to,
    version: state.task.version + 1,
    updatedAt: at,
  };

  return {
    task: nextTask,
    revision: state.revision + 1,
    transitions: [...state.transitions, transition],
  };
}
