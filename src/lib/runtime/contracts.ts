import type { CanonicalEvent } from "@/lib/control-plane/events";
import type { CanonicalTask } from "@/lib/control-plane/tasks";

export type RuntimeHealth = { ok: boolean; status?: string };
export type RuntimeAgent = { id: string; name?: string; status?: string };
export type RuntimeState = { agents?: RuntimeAgent[]; [key: string]: unknown };

export type RuntimeAdapter = {
  readonly id: string;
  health(): Promise<RuntimeHealth>;
  state(): Promise<RuntimeState>;
  registry(): Promise<RuntimeAgent[]>;
  sendMessage(input: { agentId: string; message: string; task?: CanonicalTask }): Promise<unknown>;
  handoff(input: { sourceAgentId: string; targetAgentId: string; message: string; task?: CanonicalTask }): Promise<unknown>;
  normalizeEvent(event: unknown): CanonicalEvent | null;
};
