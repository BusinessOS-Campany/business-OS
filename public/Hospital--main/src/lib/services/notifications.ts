import "server-only";
import { prisma } from "@/lib/prisma";

interface NotifyParams {
  userId?: string | null;
  title: string;
  body?: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "DANGER";
  link?: string;
}

export async function notifyUser(params: NotifyParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId ?? null,
        title: params.title,
        body: params.body,
        type: params.type,
        link: params.link,
      },
    });
  } catch (e) {
    console.error("[notify] failed to create notification:", e);
  }
}

/**
 * Architecture stub for external channels (SMS / WhatsApp / Email).
 * Integration providers are configured in SystemSettings — nothing is hard-coded.
 */
export async function sendExternalChannel(_params: {
  channel: "SMS" | "WHATSAPP" | "EMAIL";
  to: string;
  message: string;
}): Promise<void> {
  // External SMS/WhatsApp/Email gateways are pluggable integrations.
  // Configure the provider keys (e.g. sms_provider, whatsapp_api_url) in Settings.
  // Implementations for Twilio/Vonage/etc. live behind this seam.
}