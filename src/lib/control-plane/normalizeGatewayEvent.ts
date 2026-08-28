import type { EventFrame } from "@/lib/gateway/GatewayClient";
import type { AgentEventPayload, ChatEventPayload } from "@/features/agents/state/runtimeEventBridge";
import type { CanonicalEvent, CanonicalEventType } from "./events";

export type GatewayNormalizationOptions = {
  source?: string;
  now?: () => number;
  createEventId?: () => string;
};

type RuntimePayload = ChatEventPayload | AgentEventPayload;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const resolveAgentId = (payload: RuntimePayload): string | undefined => {
  const direct = isRecord(payload) ? asString(payload.agentId) : undefined;
  if (direct) return direct;

  const sessionKey = isRecord(payload) ? asString(payload.sessionKey) : undefined;
  if (!sessionKey) return undefined;

  const match = sessionKey.match(/^agent:([^:]+):/);
  return match?.[1];
};

const resolveTaskId = (payload: RuntimePayload): string | undefined => {
  if (!isRecord(payload)) return undefined;
  return asString(payload.taskId);
};

const resolveRunId = (payload: RuntimePayload): string | undefined => {
  if (!isRecord(payload)) return undefined;
  return asString(payload.runId);
};

const resolveEventType = (
  event: EventFrame["event"],
  payload: unknown
): CanonicalEventType | null => {
  if (event === "chat" && isRecord(payload)) {
    return payload.state === "final" ? "agent.message" : "agent.progress";
  }

  if (event === "agent") return "agent.progress";

  return null;
};

const defaultEventId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

/**
 * Normalize gateway transport events at the runtime adapter boundary.
 *
 * Unknown/summary events return null instead of being assigned a misleading
 * canonical meaning. Runtime-specific payloads remain intact for downstream
 * projection while the canonical envelope supplies stable correlation fields.
 */
export const normalizeGatewayEvent = (
  event: EventFrame,
  options: GatewayNormalizationOptions = {}
): CanonicalEvent<RuntimePayload> | null => {
  const payload = event.payload;
  const eventType = resolveEventType(event.event, payload);
  if (!eventType || !isRecord(payload)) return null;

  const runId = resolveRunId(payload as RuntimePayload);
  const taskId = resolveTaskId(payload as RuntimePayload);
  const agentId = resolveAgentId(payload as RuntimePayload);
  const timestamp = new Date(options.now?.() ?? Date.now()).toISOString();
  const correlationId = runId ?? taskId ?? agentId ?? `gateway:${event.event}`;

  return {
    eventId: options.createEventId?.() ?? defaultEventId(),
    eventType,
    taskId,
    runId,
    agentId,
    source: options.source ?? "hermes3d.gateway",
    timestamp,
    sequence: event.seq,
    payload: payload as RuntimePayload,
    correlationId,
    schemaVersion: 1,
  };
};
