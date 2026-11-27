interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  OWNER_TELEGRAM_IDS?: string;
  DB: D1Database;
  BUSINESS_NAME?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string; username?: string };
  };
}

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

async function telegram(
  env: Env,
  method: string,
  payload: Record<string, unknown>,
): Promise<TelegramResponse> {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const result = (await response.json()) as TelegramResponse;
  if (!response.ok || !result.ok) {
    console.error("Telegram API request failed", method, result.description);
  }
  return result;
}

function isOwner(env: Env, telegramId: number): boolean {
  const owners = (env.OWNER_TELEGRAM_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return owners.includes(String(telegramId));
}

function replyFor(text: string, businessName: string): string {
  const message = text.toLowerCase();

  if (/\b(price|prices|catalog|menu|available|availability|offer|promo)\b/.test(message)) {
    return `I can help you explore the ${businessName} catalog. Which item or option would you like to ask about? Our team can confirm current availability and pricing.`;
  }

  if (/\b(order|buy|purchase|place an order|how to order)\b/.test(message)) {
    return "I can guide you through an order inquiry. Tell me what you are interested in, and our team can confirm the current details and next steps. Please do not send payment details or sensitive personal information here.";
  }

  if (/\b(delivery|deliver|pickup|pick up|drop.?off|shipping)\b/.test(message)) {
    return "I can help with delivery and fulfilment questions. Are you asking about delivery, pickup, or another available arrangement? The team will confirm current coverage and timing.";
  }

  if (/\b(payment|pay|gcash|bank transfer|transfer|refund)\b/.test(message)) {
    return "I can help with payment questions. For your security, never share your PIN, password, one-time code, or full account details in chat. A staff member can confirm the accepted payment methods.";
  }

  if (/\b(human|staff|agent|representative|supervisor|owner|complaint|problem|issue|concern)\b/.test(message)) {
    return "I can route your concern to the team. Please briefly describe what happened, without including passwords, payment credentials, or other sensitive information.";
  }

  if (/\b(hello|hi|hey|good morning|good afternoon|good evening)\b/.test(message)) {
    return `Hello! Welcome to ${businessName}. I’m the virtual assistant for customer service and sales. What can I help you with today?`;
  }

  return "I can help with catalog questions, order inquiries, fulfilment, payment questions, and customer concerns. Tell me what you need in your own words, and I’ll guide you to the right next step.";
}

async function handleMessage(update: TelegramUpdate, env: Env): Promise<void> {
  const message = update.message;
  if (!message?.chat || !message.from || !message.text) return;
  if (message.chat.type !== "private") return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text.trim();
  const firstName = message.from.first_name ?? "there";
  const businessName = env.BUSINESS_NAME?.trim() || "CELESTIAL LOBBY";

  await env.DB.prepare(
    `INSERT INTO clients (telegram_user_id, chat_id, first_name, username, first_seen_at, last_seen_at, message_count)
     VALUES (?, ?, ?, ?, unixepoch(), unixepoch(), 1)
     ON CONFLICT(telegram_user_id) DO UPDATE SET
       chat_id = excluded.chat_id,
       first_name = excluded.first_name,
       username = excluded.username,
       last_seen_at = unixepoch(),
       message_count = clients.message_count + 1`,
  )
    .bind(userId, chatId, firstName, message.from.username ?? null)
    .run();

  if (text === "/start" || text.startsWith("/start ")) {
    await telegram(env, "setMyCommands", {
      commands: [
        { command: "start", description: "Start or reopen the assistant" },
        { command: "help", description: "See what I can help with" },
      ],
    });

    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text:
        `Welcome to ${businessName}, ${firstName}.\n\n` +
        "I’m your virtual assistant for customer service and sales. You can ask me naturally about the catalog, orders, fulfilment, payments, or a concern.\n\n" +
        "How can I help you today?",
    });
    return;
  }

  if (text === "/help") {
    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text:
        "You can simply type what you need. I can help with:\n" +
        "• Catalog and product questions\n" +
        "• Order inquiries\n" +
        "• Delivery and fulfilment questions\n" +
        "• Payment questions\n" +
        "• Concerns and staff assistance\n\n" +
        "You do not need to memorize commands.",
    });
    return;
  }

  if (text === "/status" && isOwner(env, userId)) {
    const result = await env.DB.prepare(
      "SELECT COUNT(*) AS clients, COALESCE(SUM(message_count), 0) AS messages FROM clients",
    ).first<{ clients: number; messages: number }>();

    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text: `Bot status: online\nRecorded clients: ${result?.clients ?? 0}\nMessages received: ${result?.messages ?? 0}`,
    });
    return;
  }

  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: replyFor(text, businessName),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({ service: "CELESTIAL LOBBY Telegram webhook", status: "ready" });
    }

    if (request.method !== "POST" || url.pathname !== "/telegram/webhook") {
      return json({ error: "Not found" }, 404);
    }

    const suppliedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!env.TELEGRAM_WEBHOOK_SECRET || suppliedSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return json({ error: "Unauthorized" }, 401);
    }

    let update: TelegramUpdate;
    try {
      update = (await request.json()) as TelegramUpdate;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    try {
      await handleMessage(update, env);
      return json({ ok: true });
    } catch (error) {
      console.error("Update processing failed", error);
      return json({ error: "Update processing failed" }, 500);
    }
  },
};
