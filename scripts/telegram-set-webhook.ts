import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Register (or inspect) the Telegram webhook for this deployment.
 *
 *   npm run telegram:setup            # register the webhook
 *   npm run telegram:setup -- --info  # show the current registration
 *   npm run telegram:setup -- --delete
 *
 * Pass an explicit base URL to target a deployment other than NEXTAUTH_URL:
 *   npm run telegram:setup -- --url=https://ipl.example.com
 */

// Scripts here run under bare ts-node, which does not read .env on its own.
function loadEnvFile(): void {
  try {
    const contents = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of contents.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env locally (e.g. running on CI) — rely on the real environment.
  }
}

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function callTelegram(token: string, method: string, body?: unknown) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return response.json() as Promise<{
    ok: boolean;
    result?: unknown;
    description?: string;
  }>;
}

async function main() {
  loadEnvFile();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set.");
    process.exit(1);
  }

  if (process.argv.includes("--info")) {
    const info = await callTelegram(token, "getWebhookInfo");
    console.log(JSON.stringify(info.result ?? info, null, 2));
    return;
  }

  if (process.argv.includes("--delete")) {
    const result = await callTelegram(token, "deleteWebhook", {
      drop_pending_updates: true,
    });
    console.log(result.ok ? "✅ Webhook deleted." : `❌ ${result.description}`);
    return;
  }

  if (!secret) {
    console.error(
      "❌ TELEGRAM_WEBHOOK_SECRET is not set. Generate one with: openssl rand -hex 32"
    );
    process.exit(1);
  }

  const baseUrl = argValue("url") ?? process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    console.error("❌ No base URL. Set NEXTAUTH_URL or pass --url=https://your-domain");
    process.exit(1);
  }

  if (!baseUrl.startsWith("https://")) {
    console.error(
      `❌ Telegram only delivers webhooks over HTTPS, got: ${baseUrl}\n` +
        "   For local testing, expose the dev server through a tunnel and pass --url."
    );
    process.exit(1);
  }

  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  const result = await callTelegram(token, "setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });

  if (!result.ok) {
    console.error(`❌ setWebhook failed: ${result.description}`);
    process.exit(1);
  }

  console.log(`✅ Webhook registered: ${webhookUrl}`);

  const info = await callTelegram(token, "getWebhookInfo");
  console.log(JSON.stringify(info.result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
