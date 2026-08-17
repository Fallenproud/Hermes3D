# Universal Backend Plan

> Backend-neutral Hermes3D integration plan for Hermes, Vera, and other runtimes.

## Recommendation

Do not treat the gateway WebSocket protocol as the long-term backend abstraction.

The protocol is a good transport and it is what ships today, but on its own it does not make Hermes3D backend-neutral. If every new runtime has to emulate the gateway protocol to be visible in the office, the app stays shaped around one transport instead of around agent semantics.

That matters because:

- Hermes has real control surfaces beyond the gateway protocol: ACP and an OpenAI-compatible API server.
- Vera already has a real orchestrator/gateway shape of its own.
- Every future backend would otherwise need to keep emulating a protocol that was never designed as a universal contract.

The better path is:

1. Keep the current gateway path working and unbroken.
2. Extract a backend-neutral runtime adapter inside Hermes3D.
3. Add Hermes and Vera providers against their native surfaces where possible.
4. Land UI improvements against that new architecture rather than against the transport.

## What To Keep

These are worth keeping regardless of which seam wins:

- Multi-agent UX concepts.
- `read_agent_context` as a coordination primitive.
- Agent `role` flowing into the 3D office nameplate.
- Click-to-chat behavior.
- Live speech bubble rendering for streaming text.
- Hermes-specific env var documentation.

These are not the right long-term seam:

- A protocol emulator as the primary integration path for every new backend.
- Fake-success implementations for `config.*` and approvals.
- Synthesizing runtime freshness from `Date.now()` instead of real event/message timestamps.

## Target Architecture

Hermes3D should stop treating the browser gateway client as the backend abstraction.

Instead, Studio should expose a backend-neutral runtime service with provider adapters:

```text
Browser UI
  -> Studio runtime API
    -> Hermes provider
    -> Vera provider
    -> Custom provider
```

The browser can still use WebSocket streaming from Studio, but the messages should be Hermes3D-native runtime events rather than implicitly transport-shaped events.

## Core Adapter Contract

Suggested TypeScript shape:

```ts
export type RuntimeCapability =
  | "agents"
  | "sessions"
  | "chat"
  | "streaming"
  | "agent_roles"
  | "files"
  | "skills"
  | "cron"
  | "approvals"
  | "config"
  | "session_settings";

export type RuntimeEvent =
  | { type: "presence.changed"; agents: RuntimeAgentSummary[] }
  | { type: "session.activity"; sessionKey: string; agentId: string; at: number }
  | { type: "chat.delta"; runId: string; sessionKey: string; text: string; at: number }
  | { type: "chat.final"; runId: string; sessionKey: string; text: string; at: number }
  | { type: "chat.error"; runId: string; sessionKey: string; message: string; at: number }
  | { type: "run.lifecycle"; runId: string; sessionKey: string; phase: "start" | "end" | "error"; at: number }
  | { type: "tool.progress"; runId: string; sessionKey: string; label: string; at: number };

export interface RuntimeProvider {
  readonly id: string;
  readonly label: string;
  getCapabilities(): Promise<Set<RuntimeCapability>>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(listener: (event: RuntimeEvent) => void): () => void;
  listAgents(): Promise<RuntimeAgentSummary[]>;
  listSessions(input?: { agentId?: string }): Promise<RuntimeSessionSummary[]>;
  getSessionPreview(keys: string[]): Promise<RuntimeSessionPreview[]>;
  sendChat(input: { sessionKey: string; message: string; agentId?: string }): Promise<{ runId: string }>;
  abortRun(input: { runId?: string; sessionKey?: string }): Promise<void>;
  waitForRun(input: { runId: string; timeoutMs?: number }): Promise<"running" | "done">;
}
```

Optional features such as config editing, approvals, files, skills, and cron should sit behind capability checks instead of being assumed to exist.

## Capability Matrix

Initial expected support:

| Capability | Hermes | Demo | Vera |
|---|---|---|---|
| Agents | Native | Native | Provider-defined |
| Sessions | Native | Native | Provider-defined |
| Chat send/abort/wait | Native | Native | Native via orchestrator |
| Streaming | Native | Native | Native |
| Agent roles | Native | Static | Native |
| Files | Partial | None | Optional |
| Skills | Native | None | Optional |
| Cron | Native | None | Optional |
| Approvals | Partial | Stubbed | Optional |
| Config mutation | Limited | Stubbed | Limited |

Important rule:

If a provider does not support a surface, Hermes3D should disable or hide the UI for it. It should not fake a successful write.

## Provider Strategy

### Hermes Provider

Preferred order:

1. ACP for session-aware agent orchestration.
2. Hermes API server for OpenAI-compatible chat and streaming.
3. The bundled gateway adapter as the compatibility bridge that ships today.

Rationale:

- ACP is a better semantic fit for sessions, cancellation, fork/resume, approvals, and editor-style state.
- The Hermes API server is already stable and useful for chat, tool calling, and cron-backed service behavior.
- The gateway adapter should be treated as the working default, not as the permanent contract.

### Vera Provider

Target the Vera orchestrator, not individual `vera-torch` workers.

Use:

- `POST /v1/chat/completions`
- `POST /v1/completions`
- `POST /v1/contracted-completions`
- `GET /health`
- `GET /state`
- `GET /registry`

The Vera provider should map Hermes3D agent identities to routed roles or lanes rather than pretending Vera is a gateway.

## Event Model

Current Hermes3D expects gateway-flavored `chat`, `agent`, and `presence` events.

That is too narrow for universal providers. Studio should normalize provider-native updates into a Hermes3D event model with explicit semantics:

- `presence.changed`
- `session.activity`
- `chat.delta`
- `chat.final`
- `chat.error`
- `run.lifecycle`
- `tool.progress`

Then the browser UI can consume one stable event shape no matter what backend is in use.

## High-Value PR Split

Recommended implementation order:

### PR 1: Runtime Abstraction

Scope:

- Introduce the provider interface.
- Wrap current gateway behavior in a `hermes` provider.
- Move capability checks into the UI state layer.
- Add a Studio-level runtime event normalization layer.

This is the most important PR.

### PR 2: Safe UX Cherry-Picks

Scope:

- Agent `role` in store and office UI.
- Click-to-chat.
- Streaming speech bubbles.

These are good product improvements and do not require committing to any one transport.

### PR 3: Hermes Native Provider

Scope:

- Extend the `hermes` provider to use ACP where possible.
- Use the Hermes API server for chat/streaming surfaces.
- Expose capabilities honestly.
- Persist and surface real timestamps from Hermes session/message state.

Keep the adapter path optional for compatibility, not required.

### PR 4: Vera Provider

Scope:

- Add a `vera` provider against the Vera orchestrator.
- Map Hermes3D agents to Vera roles or lanes.
- Surface orchestrator state and routed worker identity.

### PR 5: Optional Compatibility Layer Cleanup

Scope:

- Reduce how much of the app depends on protocol-shaped frames.
- Convert adapter-only routes into provider-native routes where possible.

## Why This Also Helps Vera

This path avoids making Vera imitate a transport it does not speak.

Instead, Vera can appear as:

- a routed multi-role intelligence backend,
- with Hermes3D visualizing agents, runs, status, and streamed text,
- while preserving Vera-specific routing, lane, and model identity.

That gives Hermes3D a broader identity: a 3D frontend for agent systems generally, not a viewer bound to one backend's protocol assumptions.

## Proposed First Deliverable

The first concrete deliverable should be a change that does only this:

- add the provider interface,
- wrap the existing gateway integration behind it,
- add capability flags,
- make the UI stop assuming config/approval/file support from every backend.

That creates the seam both Hermes and Vera need.
