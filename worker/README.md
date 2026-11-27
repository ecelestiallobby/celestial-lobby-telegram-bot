# Cloudflare Telegram Bot

This is the webhook deployment for `@celestiallobbybot`. It uses Cloudflare Workers and D1. The Python polling starter in the repository is retained separately.

## 1. Create the D1 database

Install the Cloudflare Wrangler CLI and authenticate:

```bash
npm install -g wrangler
wrangler login
```

From the `worker` directory, create the database:

```bash
wrangler d1 create celestial-lobby-bot
```

Copy the returned database ID into `wrangler.toml`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

Apply the schema:

```bash
wrangler d1 execute celestial-lobby-bot --remote --file=./schema.sql
```

## 2. Add secrets

Generate a long random webhook secret. Telegram accepts 1-256 characters using letters, digits, underscore, and hyphen.

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

Paste each value into the secure CLI prompt. Do not put either secret in GitHub.

Optional owner-only status access:

```bash
wrangler secret put OWNER_TELEGRAM_IDS
```

Enter comma-separated numeric Telegram user IDs. The `/status` command is only available to these IDs.

## 3. Deploy

```bash
wrangler deploy
```

Copy the deployed Worker URL, for example:

`https://celestial-lobby-telegram-bot.<your-subdomain>.workers.dev`

## 4. Register the Telegram webhook

Set the webhook URL and the same webhook secret used in the Worker. Run this from a terminal, replacing the placeholders:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<YOUR_WORKER_HOST>/telegram/webhook","secret_token":"<YOUR_WEBHOOK_SECRET>","allowed_updates":["message"]}' 
```

Keep the bot token private. Do not paste the completed URL or token into public issues or commits.

Check the Worker health endpoint by opening its root URL in a browser. It should return a JSON response with `"status":"ready"`.

## Current behavior

- `/start` sends the welcome message and configures the Telegram command menu.
- `/help` explains the available assistance.
- Natural-language messages are routed to basic customer-service responses.
- `/status` is owner-only when owner IDs are configured.
- D1 stores Telegram user ID, chat ID, first/last activity, and message count.
- Customer-facing access is unified. There is no Guest versus Regular Client split.
- Catalog prices, stock, payment instructions, and business policies are intentionally not hardcoded.

This is an initial webhook foundation. It is not yet connected to a live catalog, order-management system, staff inbox, or the CELESTIAL LOBBY Mini App.
