# CELESTIAL LOBBY Telegram Bot

A single conversational Telegram assistant combining customer service and sales support. Every customer receives the same customer-facing experience. Staff tools are separately restricted.

## First milestone
- Welcome on /start and greet returning users when they message.
- Conversational help for store questions, order inquiries, fulfilment and concerns.
- Persistent Telegram command menu.
- SQLite activity tracking.
- Optional owner-only /status command.

## Run locally
Python 3.11+ is recommended.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app.main
```

On Windows, activate with `.venv\\Scripts\\activate`. Add your BotFather token to `.env`.

## Environment
- `TELEGRAM_BOT_TOKEN` required.
- `OWNER_TELEGRAM_IDS` optional comma-separated numeric Telegram IDs.
- `BUSINESS_NAME` optional.

Never commit your real token. Add it to the hosting provider's secret/environment settings.

## Notes
This is a starter foundation, not a production ordering or payment system. Catalog, prices, availability and policies are intentionally not hardcoded until confirmed. No payment processing is implemented. Do not request passwords, PINs, OTPs or full payment credentials.

Telegram does not notify bots when someone merely opens an existing chat. The bot can greet on /start and when a returning user sends a message.
