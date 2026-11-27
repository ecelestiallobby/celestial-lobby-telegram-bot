"""CELESTIAL LOBBY conversational Telegram assistant."""
import logging
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from telegram import BotCommand, Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
BUSINESS_NAME = os.getenv("BUSINESS_NAME", "CELESTIAL LOBBY").strip()
OWNER_IDS = {int(x.strip()) for x in os.getenv("OWNER_TELEGRAM_IDS", "").split(",") if x.strip().isdigit()}
DB_PATH = ROOT / "data" / "bot.sqlite3"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("celestial-lobby")


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS clients (
            telegram_id INTEGER PRIMARY KEY,
            first_seen TEXT NOT NULL,
            last_seen TEXT NOT NULL,
            message_count INTEGER NOT NULL DEFAULT 0
        )""")


def record_activity(user_id: int) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as db:
        exists = db.execute("SELECT 1 FROM clients WHERE telegram_id=?", (user_id,)).fetchone()
        if exists:
            db.execute("UPDATE clients SET last_seen=?, message_count=message_count+1 WHERE telegram_id=?", (now, user_id))
        else:
            db.execute("INSERT INTO clients (telegram_id, first_seen, last_seen, message_count) VALUES (?, ?, ?, 1)", (user_id, now, now))
    return exists is not None


WELCOME = (
    f"Welcome to {BUSINESS_NAME}.\n\n"
    "I’m your CELESTIAL LOBBY assistant. I can answer questions, explain the store, "
    "guide an order inquiry, or help with a concern.\n\nWhat would you like help with?"
)
RETURNING = f"Welcome back to {BUSINESS_NAME}. What can I help you with today?"
HELP_TEXT = (
    "Just type what you need. I can help with store information, product questions, "
    "order inquiries, fulfilment information, and customer concerns."
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user:
        record_activity(update.effective_user.id)
    if update.message:
        await update.message.reply_text(WELCOME)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message:
        await update.message.reply_text(HELP_TEXT)


async def staff_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not user or user.id not in OWNER_IDS:
        if update.message:
            await update.message.reply_text("This command is restricted to authorized staff.")
        return
    with sqlite3.connect(DB_PATH) as db:
        count = db.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
    await update.message.reply_text(f"{BUSINESS_NAME} bot status: online\nKnown chat profiles: {count}")


def make_reply(message: str) -> str:
    text = " ".join(message.lower().strip().split())
    if any(x in text for x in ("hello", "hi", "hey", "good morning", "good evening")):
        return "Hello. Welcome to CELESTIAL LOBBY. What can I help you with?"
    if any(x in text for x in ("price", "catalog", "menu", "product", "store", "available")):
        return ("I can help with store information. The current catalog and availability "
                "are being configured, so I won't quote unverified prices or stock. What are you looking for?")
    if any(x in text for x in ("order", "buy", "purchase", "checkout")):
        return ("Tell me what you're looking for and I can guide your inquiry. The team must confirm "
                "availability, final total and fulfilment before an order is confirmed.")
    if any(x in text for x in ("delivery", "pickup", "pick up", "drop off", "shipping")):
        return "I can help with fulfilment questions. Options and timing need confirmation from the team."
    if any(x in text for x in ("payment", "pay", "gcash", "bank", "refund")):
        return ("For payment questions, wait for confirmation through an official CELESTIAL LOBBY channel. "
                "Never send passwords, PINs, OTPs or full card details here.")
    if any(x in text for x in ("problem", "issue", "complaint", "concern", "wrong", "late")):
        return ("Please describe what happened without sharing passwords, OTPs or other sensitive information. "
                "The team can review your concern.")
    if any(x in text for x in ("human", "staff", "agent", "representative", "owner")):
        return "Describe what you need help with and I’ll prepare the details for the team."
    return ("I can help with store questions, order guidance, fulfilment information and customer concerns. "
            "Tell me a little more about what you need.")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user, message = update.effective_user, update.message
    if not user or not message or not message.text:
        return
    returning = record_activity(user.id)
    await message.reply_text(RETURNING if returning else make_reply(message.text))


async def post_init(application: Application):
    await application.bot.set_my_commands([
        BotCommand("start", "Open CELESTIAL LOBBY"),
        BotCommand("help", "What can I ask?"),
    ])


def main():
    if not TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is missing. Copy .env.example to .env and add your BotFather token.")
    init_db()
    app = Application.builder().token(TOKEN).post_init(post_init).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", staff_status))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    logger.info("%s bot starting in polling mode", BUSINESS_NAME)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
