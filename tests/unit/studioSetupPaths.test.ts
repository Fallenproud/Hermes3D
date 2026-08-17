// @vitest-environment node

import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("studio setup paths", () => {
  it("resolves settings path under HERMES_STATE_DIR when set", async () => {
    const { resolveStudioSettingsPath } = await import("../../server/studio-settings");
    const settingsPath = resolveStudioSettingsPath({
      HERMES_STATE_DIR: "/tmp/hermes-state",
    } as unknown as NodeJS.ProcessEnv);
    expect(settingsPath).toBe(
      path.join(path.resolve("/tmp/hermes-state"), "hermes3d", "settings.json")
    );
  });

  it("resolves settings path under ~/.hermes by default", async () => {
    const { resolveStudioSettingsPath } = await import("../../server/studio-settings");
    const settingsPath = resolveStudioSettingsPath({} as NodeJS.ProcessEnv);
    expect(settingsPath).toBe(
      path.join(os.homedir(), ".hermes", "hermes3d", "settings.json")
    );
  });
});
