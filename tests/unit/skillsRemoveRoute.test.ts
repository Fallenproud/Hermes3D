import { beforeEach, describe, expect, it, vi } from "vitest";

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { POST } from "@/app/api/gateway/skills/remove/route";

const ORIGINAL_ENV = { ...process.env };

vi.mock("node:child_process", () => {
  return {
    spawnSync: vi.fn(),
  };
});

const mockedSpawnSync = vi.mocked(spawnSync);

const writeStudioSettings = (gatewayUrl: string) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "studio-state-"));
  process.env.HERMES_STATE_DIR = stateDir;

  const settingsDir = path.join(stateDir, "hermes3d");
  fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(
    path.join(settingsDir, "settings.json"),
    JSON.stringify(
      {
        version: 1,
        gateway: { url: gatewayUrl, token: "token-123" },
        focused: {},
      },
      null,
      2
    ),
    "utf8"
  );
};

describe("skills remove route", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.HERMES_GATEWAY_SSH_TARGET;
    delete process.env.HERMES_GATEWAY_SSH_USER;
    delete process.env.HERMES_STATE_DIR;
    mockedSpawnSync.mockReset();
  });

  it("rejects invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/gateway/skills/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
  });

  it("removes skills via ssh for remote gateways", async () => {
    writeStudioSettings("ws://example.test:18789");

    mockedSpawnSync.mockReturnValueOnce({
      status: 0,
      stdout: JSON.stringify({
        removed: true,
        removedPath: "/home/ubuntu/.hermes/skills/github",
        source: "hermes-managed",
      }),
      stderr: "",
      error: undefined,
    } as never);

    const response = await POST(
      new Request("http://localhost/api/gateway/skills/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skillKey: "github",
          source: "hermes-managed",
          baseDir: "/home/ubuntu/.hermes/skills/github",
          workspaceDir: "/home/ubuntu/.hermes/workspace-main",
          managedSkillsDir: "/home/ubuntu/.hermes/skills",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockedSpawnSync).toHaveBeenCalledTimes(1);

    const [cmd, args] = mockedSpawnSync.mock.calls[0] as [string, string[]];
    expect(cmd).toBe("ssh");
    expect(args).toEqual(
      expect.arrayContaining([
        "-o",
        "BatchMode=yes",
        "ubuntu@example.test",
        "bash",
        "-s",
        "--",
        "github",
        "hermes-managed",
      ])
    );
  });

  it("removes local workspace skills without ssh", async () => {
    writeStudioSettings("ws://localhost:18789");

    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-"));
    const managedSkillsDir = fs.mkdtempSync(path.join(os.tmpdir(), "managed-"));
    const skillDir = path.join(workspaceDir, "skills", "github");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# skill", "utf8");

    const response = await POST(
      new Request("http://localhost/api/gateway/skills/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skillKey: "github",
          source: "hermes-workspace",
          baseDir: skillDir,
          workspaceDir,
          managedSkillsDir,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockedSpawnSync).not.toHaveBeenCalled();

    const body = (await response.json()) as {
      result: { removed: boolean; removedPath: string; source: string };
    };
    expect(body.result).toEqual({
      removed: true,
      removedPath: skillDir,
      source: "hermes-workspace",
    });
    expect(fs.existsSync(skillDir)).toBe(false);
  });

  it("rejects remote workspace skill removal over ssh", async () => {
    writeStudioSettings("ws://example.test:18789");

    mockedSpawnSync.mockReturnValueOnce({
      status: 1,
      stdout: "",
      stderr: "Remote workspace skill removal is not supported over SSH.",
      error: undefined,
    } as never);

    const response = await POST(
      new Request("http://localhost/api/gateway/skills/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skillKey: "github",
          source: "hermes-workspace",
          baseDir: "/home/ubuntu/workspace-main/skills/github",
          workspaceDir: "/home/ubuntu/workspace-main",
          managedSkillsDir: "/home/ubuntu/.hermes/skills",
        }),
      })
    );

    expect(response.status).toBe(400);
  });
});
