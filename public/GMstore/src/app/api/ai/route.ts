import { NextResponse } from "next/server";

const MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.2-3b-instruct",
];

const SYSTEM_PROMPT = `أنت مساعد ذكي لـ WANOSTORE (متجر إلكتروني يمني). أجب بالعربية دائماً، بإيجاز ومباشرة.
المنتجات بالريال اليمني. مجاني الشحن للطلبات فوق 5000 ريال.
إذا سأل المستخدم عن منتج، اقترح عليه تصفح /products أو ابحث في قاعدة بيانات المنتجات.`;

async function runCloudflare(accountId: string, token: string, messages: any[]) {
  const body = {
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    max_tokens: 512,
  };
  let lastError: { errors?: { code?: number }[] } | null = null;
  for (const model of MODELS) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json().catch(() => null);
    if (res.ok) {
      const text = data?.result?.response;
      if (text) return { text, model };
    }
    lastError = data;
  }
  if (lastError?.errors?.[0]?.code === 10007) {
    throw new Error("QUOTA_EXCEEDED");
  }
  throw new Error("AI service error");
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!messages?.length) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !token) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const cleanMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const { text } = await runCloudflare(accountId, token, cleanMessages);
    return NextResponse.json({ content: text });
  } catch (e: any) {
    if (e?.message === "QUOTA_EXCEEDED") {
      return NextResponse.json({ error: "تم تجاوز حد الطلبات المجانية. حاول لاحقاً." }, { status: 429 });
    }
    if (e?.message === "AI service error") {
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
