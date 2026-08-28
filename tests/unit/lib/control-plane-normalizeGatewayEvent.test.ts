import { describe, expect, it } from "vitest";
import { normalizeGatewayEvent } from "@/lib/control-plane/normalizeGatewayEvent";

describe("normalizeGatewayEvent", () => {
  const options = {
    now: () => 1_700_000_000_000,
    createEventId: () => "evt-test",
    source: "test.gateway",
  };

  it("normalizes chat deltas as agent progress", () => {
    const result = normalizeGatewayEvent(
      {
        type: "event",
        event: "chat",
        seq: 7,
        payload: {
          runId: "run-1",
          sessionKey: "agent:alpha:main",
          state: "delta",
          message: { role: "assistant", content: "hello" },
        },
      },
      options
    );

    expect(result).toMatchObject({
      eventId: "evt-test",
      eventType: "agent.progress",
      runId: "run-1",
      agentId: "alpha",
      source: "test.gateway",
      sequence: 7,
      correlationId: "run-1",
      schemaVersion: 1,
    });
  });

  it("normalizes final chat messages without pretending task acceptance", () => {
    const result = normalizeGatewayEvent(
      {
        type: "event",
        event: "chat",
        payload: {
          runId: "run-2",
          sessionKey: "agent:beta:main",
          state: "final",
          message: { role: "assistant", content: "done" },
        },
      },
      options
    );

    expect(result?.eventType).toBe("agent.message");
    expect(result?.agentId).toBe("beta");
    expect(result?.correlationId).toBe("run-2");
  });

  it("preserves an explicit task id for future canonical projections", () => {
    const result = normalizeGatewayEvent(
      {
        type: "event",
        event: "agent",
        payload: {
          runId: "run-3",
          taskId: "task-3",
          agentId: "gamma",
          stream: "lifecycle",
          data: { phase: "start" },
        },
      },
      options
    );

    expect(result).toMatchObject({
      eventType: "agent.progress",
      taskId: "task-3",
      runId: "run-3",
      agentId: "gamma",
    });
  });

  it("does not invent canonical meaning for presence, heartbeat, or unknown events", () => {
    expect(
      normalizeGatewayEvent(
        { type: "event", event: "presence", payload: { connected: true } },
        options
      )
    ).toBeNull();

    expect(
      normalizeGatewayEvent(
        { type: "event", event: "unknown", payload: { value: true } },
        options
      )
    ).toBeNull();
  });
});
