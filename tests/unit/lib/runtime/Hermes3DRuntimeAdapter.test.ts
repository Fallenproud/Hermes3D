import { describe, expect, it, vi } from "vitest";
import { Hermes3DRuntimeAdapter } from "@/lib/runtime/Hermes3DRuntimeAdapter";
import type { GatewayClient } from "@/lib/gateway/GatewayClient";

describe("Hermes3DRuntimeAdapter", () => {
  it("maps message and handoff operations to the gateway contract", async () => {
    const call = vi.fn().mockResolvedValue({ ok: true });
    const adapter = new Hermes3DRuntimeAdapter({ call } as unknown as GatewayClient);

    await adapter.sendMessage({ agentId: "a1", message: "run" });
    await adapter.handoff({ sourceAgentId: "a1", targetAgentId: "a2", message: "handoff" });

    expect(call).toHaveBeenNthCalledWith(1, "agents.message", { agentId: "a1", message: "run" });
    expect(call).toHaveBeenNthCalledWith(2, "agents.handoff", { sourceAgentId: "a1", targetAgentId: "a2", message: "handoff" });
  });
});
