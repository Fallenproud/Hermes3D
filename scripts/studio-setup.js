const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");

const { resolveStudioSettingsPath, resolveStateDir } = require("../server/studio-settings");

const DEFAULT_GATEWAY_URL = "ws://127.0.0.1:18789";

const parseArgs = (argv) => {
  return {
    force: argv.includes("--force"),
  };
};

const tryReadGatewayTokenFromHermesConfig = () => {
  try {
    const configPath = path.join(resolveStateDir(process.env), "hermes.json");
    if (!fs.existsSync(configPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const token = parsed?.gateway?.auth?.token;
    return typeof token === "string" && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const settingsPath = resolveStudioSettingsPath(process.env);
  const settingsDir = path.dirname(settingsPath);

  if (fs.existsSync(settingsPath) && !args.force) {
    console.error(
      `Studio settings already exist at ${settingsPath}. Re-run with --force to overwrite.`
    );
    process.exitCode = 1;
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const urlAnswer = await rl.question(
      `Upstream Gateway URL [${DEFAULT_GATEWAY_URL}]: `
    );
    const gatewayUrl = (urlAnswer || DEFAULT_GATEWAY_URL).trim();
    if (!gatewayUrl) {
      throw new Error("Gateway URL is required.");
    }

    const tokenDefault = tryReadGatewayTokenFromHermesConfig();
    const tokenPrompt = tokenDefault
      ? "Upstream Gateway Token [detected from ~/.hermes/hermes.json]: "
      : "Upstream Gateway Token: ";
    const tokenAnswer = await rl.question(tokenPrompt);
    const token = (tokenAnswer || tokenDefault || "").trim();
    if (!token) {
      throw new Error(
        "Gateway token is required. Provide it, or set gateway.auth.token in ~/.hermes/hermes.json so it can be auto-detected."
      );
    }

    fs.mkdirSync(settingsDir, { recursive: true });
    const next = {
      version: 1,
      gateway: {
        url: gatewayUrl,
        token,
      },
    };
    fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2), "utf8");

    console.info(`Wrote Studio settings to ${settingsPath}.`);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(msg);
  process.exitCode = 1;
});

