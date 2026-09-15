import { cookies } from "next/headers";
import { isLocale, defaultLocale, getMessages, LOCALE_COOKIE } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { getQueueBoard } from "@/lib/services/reception";
import { AutoRefresh } from "@/features/reception/auto-refresh";
import { initials } from "@/lib/utils";

export const metadata = { title: "Queue Display" };

export default async function QueueDisplayPage() {
  await requirePermission("reception");
  const store = await cookies();
  const localeRaw = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => {
    const value = key.split(".").reduce<unknown>(
      (o, k) => (o as Record<string, unknown>)?.[k],
      messages
    );
    return typeof value === "string" ? value : key;
  };

  const { nowServing, waiting } = await getQueueBoard();
  const nameOf = (p: { nameAr: string; nameEn: string }) => (locale === "ar" ? p.nameAr : p.nameEn);

  const framed = [...(nowServing ? [nowServing] : []), ...waiting].slice(0, 8);

  return (
    <main className="min-h-svh bg-background p-6" dir={locale === "ar" ? "rtl" : "ltr"}>
      <AutoRefresh seconds={15} />
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("common.appName")}</p>
          <h1 className="text-xl font-bold">{t("reception.tvDisplay")}</h1>
        </div>
        <p className="font-mono text-lg tabular-nums">
          {nowServing ? nowServing.ticketNo : t("common.all")} ·{" "}
          {new Date().toLocaleTimeString(locale === "ar" ? "ar-YE" : "en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </header>

      <section className="mt-8">
        <p className="mb-3 text-sm font-medium text-muted-foreground">{t("reception.currentNumber")}</p>
        {nowServing ? (
          <div className="flex items-center justify-between rounded-2xl border-2 border-primary bg-primary/5 p-8">
            <div>
              <p className="font-mono text-7xl font-extrabold tracking-tight text-foreground tabular-nums">
                {nowServing.ticketNo}
              </p>
              <p className="mt-2 text-3xl font-semibold">{nameOf(nowServing.patient)}</p>
              <p className="mt-1 text-muted-foreground tabular-nums">{nowServing.patient.mrn}</p>
              {nowServing.department ? (
                <p className="mt-1 text-lg text-muted-foreground">
                  {locale === "ar" ? nowServing.department.nameAr : nowServing.department.nameEn}
                </p>
              ) : null}
            </div>
            <span className="hidden text-6xl sm:inline-block">{initials(nameOf(nowServing.patient))}</span>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed p-8 text-center">
            <p className="text-2xl text-muted-foreground">{t("reception.noPatientsWaiting")}</p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <p className="mb-3 text-sm font-medium text-muted-foreground">{t("reception.waitingCount")}</p>
        {framed.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
            {t("reception.noPatientsWaiting")}
          </div>
        ) : (
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {framed.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border bg-card p-4 text-center"
                style={{ opacity: item.status === "CALLED" ? 0.55 : 1 }}
              >
                <p className="text-3xl font-bold tabular-nums">{item.ticketNo}</p>
                <p className="mt-1 truncate text-sm">{nameOf(item.patient)}</p>
                <p className="truncate text-xs text-muted-foreground tabular-nums">{item.patient.mrn}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}