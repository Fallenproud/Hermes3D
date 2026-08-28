import { describe, expect, it, vi } from "vitest";
import { HermesRuntimeAdapter, OpenClawRuntimeAdapter } from "@/lib/runtime/providerAdapters";

describe("provider runtime adapters", () => {
  it("keeps Hermes and OpenClaw identities distinct while sharing the contract", async () => {
    const transport = { request: vi.fn().mockResolvedValue({ ok: true }) };
    const hermes = new HermesRuntimeAdapter(transport);
    const openclaw = new OpenClawRuntimeAdapter(transport);

    expect(hermes.id).toBe("hermes");
    expect(openclaw.id).toBe("openclaw");
    await hermes.health();
    await openclaw.health();
    expect(transport.request).toHaveBeenNthCalledWith(1, "health", {});
    expect(transport.request).toHaveBeenNthCalledWith(2, "health", {});
  });
});
