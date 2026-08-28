import type { CanonicalEvent } from "@/lib/control-plane/events";
import { normalizeGatewayEvent } from "@/lib/control-plane/normalizeGatewayEvent";
import type { RuntimeTransport } from "./ProviderRuntimeAdapter";
import { ProviderRuntimeAdapter } from "./ProviderRuntimeAdapter";

export class HermesRuntimeAdapter extends ProviderRuntimeAdapter {
  constructor(transport: RuntimeTransport) {
    super({ id: "hermes", transport, normalizeEvent: (event) => normalizeGatewayEvent(event) });
  }
}

export class OpenClawRuntimeAdapter extends ProviderRuntimeAdapter {
  constructor(transport: RuntimeTransport, normalizeEvent?: (event: unknown) => CanonicalEvent | null) {
    super({ id: "openclaw", transport, normalizeEvent });
  }
}
