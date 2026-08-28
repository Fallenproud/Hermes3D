import type { CanonicalTask } from "@/lib/control-plane/tasks";
import type { RuntimeAdapter, RuntimeAgent, RuntimeHealth, RuntimeState } from "./contracts";

export type RuntimeTransport = {
  request<T>(operation: string, params: unknown): Promise<T>;
};

type ProviderConfig = {
  id: string;
  transport: RuntimeTransport;
  normalizeEvent?: RuntimeAdapter["normalizeEvent"];
};

export class ProviderRuntimeAdapter implements RuntimeAdapter {
  readonly id: string;
  private readonly transport: RuntimeTransport;
  private readonly eventNormalizer: RuntimeAdapter["normalizeEvent"];

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.transport = config.transport;
    this.eventNormalizer = config.normalizeEvent ?? (() => null);
  }

  health() {
    return this.transport.request<RuntimeHealth>("health", {});
  }

  state() {
    return this.transport.request<RuntimeState>("state", {});
  }

  async registry() {
    const value = await this.transport.request<unknown>("registry", {});
    if (Array.isArray(value)) return value as RuntimeAgent[];
    if (value && typeof value === "object" && Array.isArray((value as { agents?: unknown }).agents)) {
      return (value as { agents: RuntimeAgent[] }).agents;
    }
    return [];
  }

  sendMessage(input: { agentId: string; message: string; task?: CanonicalTask }) {
    return this.transport.request("agents.message", {
      agentId: input.agentId,
      message: input.message,
      ...(input.task ? { taskId: input.task.taskId, acceptanceCriteria: input.task.acceptanceCriteria, deliverables: input.task.deliverables } : {}),
    });
  }

  handoff(input: { sourceAgentId: string; targetAgentId: string; message: string; task?: CanonicalTask }) {
    return this.transport.request("agents.handoff", {
      sourceAgentId: input.sourceAgentId,
      targetAgentId: input.targetAgentId,
      message: input.message,
      ...(input.task ? { taskId: input.task.taskId, acceptanceCriteria: input.task.acceptanceCriteria, deliverables: input.task.deliverables } : {}),
    });
  }

  normalizeEvent(event: unknown) {
    return this.eventNormalizer(event);
  }
}
