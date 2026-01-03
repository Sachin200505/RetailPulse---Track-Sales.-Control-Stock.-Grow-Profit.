import { ENV } from "../config/env";

export const sendTelegramMessage = async (
  chatId: string,
  text: string
): Promise<boolean> => {
  const token = ENV.TELEGRAM_BILLING_BOT_TOKEN;
  if (!token) {
    console.warn("Telegram skipped: missing bot token");
    return false;
  }
  if (!chatId) {
    console.warn("Telegram skipped: missing chat id");
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error("Telegram send failed", resp.status, body);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Telegram send error", error);
    return false;
  }
};
