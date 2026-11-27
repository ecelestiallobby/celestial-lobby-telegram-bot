# CELESTIAL LOBBY Telegram Bot

A single conversational Telegram assistant for `@celestiallobbybot`, combining customer service and sales support. Every customer receives the same customer-facing experience. Staff tools are separately restricted.

## Deployment path

**Cloudflare Workers + D1 is the intended hosting path** for the webhook bot.

- Worker source: [worker/src/index.ts](worker/src/index.ts)
- D1 schema: [worker/schema.sql](worker/schema.sql)
- Wrangler configuration: [worker/wrangler.toml](worker/wrangler.toml)
- Setup and deployment guide: [worker/README.md](worker/README.md)

Follow the [Cloudflare deployment guide](worker/README.md) to create the D1 database, configure secrets, deploy the Worker, and register the Telegram webhook.

## First milestone

- Welcome on `/start`; returning users receive a response when they message the bot.
- Conversational help for catalog questions, order inquiries, fulfilment, payments, and concerns.
- Telegram command menu.
- D1 activity tracking in the Cloudflare deployment.
- Optional owner-only `/status` command.

## Local Python starter

The original Python polling implementation is retained for local development/reference. It uses Python 3.11+, `python-telegram-bot`, and local SQLite.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app.main
```

On Windows, activate with `.venv\\Scripts\\activate`.

## Secrets and safety

- `TELEGRAM_BOT_TOKEN` is required.
- `TELEGRAM_WEBHOOK_SECRET` protects the Cloudflare webhook.
- `OWNER_TELEGRAM_IDS` is an optional comma-separated list of numeric Telegram IDs.
- `BUSINESS_NAME` is optional.

Never commit real tokens or secrets. Configure them using Cloudflare Worker secrets or local environment variables. Do not request passwords, PINs, OTPs, or full payment credentials.

## Scope and limitations

This is an initial bot foundation, not a production ordering or payment system. Catalog, prices, availability, and business policies are intentionally not hardcoded until confirmed. The bot is not yet connected to a live catalog, order-management system, staff inbox, or the CELESTIAL LOBBY Mini App.

Telegram does not notify bots when someone merely opens an existing chat. The bot can greet on `/start` and respond when a returning user sends a message.
