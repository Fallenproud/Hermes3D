import type { CanonicalTask } from "@/lib/control-plane/tasks";
import { normalizeGatewayEvent } from "@/lib/control-plane/normalizeGatewayEvent";
import { GatewayClient } from "@/lib/gateway/GatewayClient";
import type { RuntimeAdapter, RuntimeAgent, RuntimeHealth, RuntimeState } from "./contracts";

export class Hermes3DRuntimeAdapter implements RuntimeAdapter {
  readonly id = "hermes3d-gateway";
  constructor(private readonly gateway: GatewayClient) {}

  async health(): Promise<RuntimeHealth> {
    const value = await this.gateway.call<Record<string, unknown>>("health", {});
    return { ok: value?.ok !== false, status: typeof value?.status === "string" ? value.status : undefined };
  }

  async state(): Promise<RuntimeState> {
    return this.gateway.call<RuntimeState>("state", {});
  }

  async registry(): Promise<RuntimeAgent[]> {
    const value = await this.gateway.call<unknown>("registry", {});
    if (Array.isArray(value)) return value as RuntimeAgent[];
    if (value && typeof value === "object" && Array.isArray((value as { agents?: unknown }).agents)) {
      return (value as { agents: RuntimeAgent[] }).agents;
    }
    return [];
  }

  async sendMessage(input: { agentId: string; message: string; task?: CanonicalTask }) {
    return this.gateway.call("agents.message", {
      agentId: input.agentId,
      message: input.message,
      ...(input.task ? { taskId: input.task.taskId, acceptanceCriteria: input.task.acceptanceCriteria, deliverables: input.task.deliverables } : {}),
    });
  }

  async handoff(input: { sourceAgentId: string; targetAgentId: string; message: string; task?: CanonicalTask }) {
    return this.gateway.call("agents.handoff", {
      sourceAgentId: input.sourceAgentId,
      targetAgentId: input.targetAgentId,
      message: input.message,
      ...(input.task ? { taskId: input.task.taskId, acceptanceCriteria: input.task.acceptanceCriteria, deliverables: input.task.deliverables } : {}),
    });
  }

  normalizeEvent(event: unknown) {
    return normalizeGatewayEvent(event);
  }
}
