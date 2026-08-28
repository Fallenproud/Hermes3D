import { describe, expect, it, vi } from "vitest";
import { Hermes3DRuntimeAdapter } from "@/lib/runtime/Hermes3DRuntimeAdapter";
import type { GatewayClient } from "@/lib/gateway/GatewayClient";

describe("Hermes3DRuntimeAdapter", () => {
  it("maps control-plane message and handoff contracts to gateway calls", async () => {
    const call = vi.fn().mockResolvedValue({ ok: true });
    const adapter = new Hermes3DRuntimeAdapter({ call } as unknown as GatewayClient);

    await adapter.sendMessage({ agentId: "a1", message: "run", task: {
      taskId: "t1", version: 1, goal: "g", intent: "i", source: { type: "user" }, constraints: [], context: {}, deliverables: [], acceptanceCriteria: [], expectedState: { assertions: [] }, execution: {}, risk: { level: "low" }, confidence: { score: 1 }, verification: { required: false, minimumConfidence: 0 }, retry: { maxAttempts: 1, maxCost: 1, escalateToHuman: false }, evidence: [], status: "assigned", createdAt: "now", updatedAt: "now"
    } });
    await adapter.handoff({ sourceAgentId: "a1", targetAgentId: "a2", message: "handoff" });

    expect(call).toHaveBeenNthCalledWith(1, "agents.message", expect.objectContaining({ agentId: "a1", taskId: "t1" }));
    expect(call).toHaveBeenNthCalledWith(2, "agents.handoff", expect.objectContaining({ sourceAgentId: "a1", targetAgentId: "a2" }));
  });
});
