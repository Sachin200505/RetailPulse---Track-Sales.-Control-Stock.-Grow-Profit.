import twilio from "twilio";
import { ENV } from "../config/env";

const normalizeNumber = (value?: string | null): string | null => {
  if (!value) return null;
  const base = value.split("#")[0] || "";
  const trimmed = base.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) return trimmed;
  if (digits.length === 10) return `+91${digits}`; // assume local 10-digit
  if (digits.length > 0) return `+${digits}`;

  return null;
};

const fromNumber = normalizeNumber(ENV.TWILIO_FROM_NUMBER);
const hasTwilioConfig =
  !!ENV.TWILIO_ACCOUNT_SID && !!ENV.TWILIO_AUTH_TOKEN && !!fromNumber;

const client = hasTwilioConfig
  ? twilio(ENV.TWILIO_ACCOUNT_SID, ENV.TWILIO_AUTH_TOKEN)
  : null;

export const sendSMS = async (phone: string, message: string) => {
  const toNumber = normalizeNumber(phone);

  if (!toNumber) {
    console.warn("SMS skipped: missing or invalid phone number");
    return false;
  }

  if (!hasTwilioConfig || !client) {
    console.warn("SMS skipped: Twilio config missing");
    return false;
  }

  try {
    await client.messages.create({
      to: toNumber,
      from: fromNumber!,
      body: message,
    });
    console.log(`📨 SMS sent to ${toNumber}`);
    return true;
  } catch (error) {
    console.error("SMS sending failed", error);
    return false;
  }
};
