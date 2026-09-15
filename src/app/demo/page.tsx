"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, useState } from "react";
import {
  Store,
  ShoppingCart,
  Stethoscope,
  Coffee,
  Monitor,
  Clock3,
  ExternalLink,
  Package,
  TrendingUp,
  Wallet,
  Users,
  CalendarDays,
  Receipt,
  ArrowLeft,
  Zap,
  CheckCircle2,
  Timer,
  Lock,
  Bed,
} from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import {
  DEMO_DURATION_MS,
  readDemoTrial,
  startDemoTrial,
  subscribeDemoTrial,
  isDemoExpired,
  demoRemainingParts,
  type DemoTrial,
} from "@/core/demo/trial";

type SystemKey = "grocery" | "clinic" | "cafe" | "hospital";

interface SystemDef {
  key: SystemKey;
  icon: typeof Store;
  name: string;
  tagline: string;
  stats: { icon: typeof Store; label: string; value: string }[];
  tableTitle: string;
  rows: string[][];
}

const SYSTEMS: SystemDef[] = [
  {
    key: "grocery",
    icon: ShoppingCart,
    name: "نظام بقاله",
    tagline: "منتجات وباركود وموردين وعملاء وتقارير ربح لبقالتك.",
    stats: [
      { icon: Wallet, label: "فواتير اليوم", value: "48" },
      { icon: TrendingUp, label: "الربح اليوم", value: "3,240 ر.س" },
      { icon: Package, label: "المنتجات", value: "2,980" },
      { icon: Users, label: "الموردون", value: "32" },
    ],
    tableTitle: "أحدث الفواتير",
    rows: [
      ["INV-2041", "محمد العلي", "اليوم", "540 ر.س"],
      ["INV-2040", "سوبر ماركت النور", "اليوم", "1,120 ر.س"],
      ["INV-2039", "مطعم الشرق", "أمس", "860 ر.س"],
      ["INV-2038", "سارة أحمد", "أمس", "230 ر.س"],
    ],
  },
{
    key: "clinic",
    icon: Stethoscope,
    name: "نظام علاج طبيعي",
    tagline: "إدارة المرضى والجلسات والمواعيد والمدفوعات لمركزك الصحي.",
    stats: [
      { icon: Users, label: "المرضى", value: "520" },
      { icon: CalendarDays, label: "جلسات اليوم", value: "34" },
      { icon: Receipt, label: "المواعيد", value: "41" },
      { icon: Wallet, label: "الإيرادات هذا الشهر", value: "64,000 ر.س" },
    ],
    tableTitle: "مواعيد اليوم",
    rows: [
      ["أحمد حسن", "جلسة علاج طبيعي", "09:00", "مؤكد"],
      ["فاطمة سعيد", "فحص طبي", "10:30", "مؤكد"],
      ["خالد عمر", "متابعة", "12:00", "منتظر"],
      ["نورة يوسف", "جلسة أولى", "14:00", "مؤكد"],
    ],
  },
  {
    key: "cafe",
    icon: Coffee,
    name: "نظام اداره المقاهي",
    tagline: "إدارة المقهى الإلكتروني — أجهزة وجلسات وشحن ورواتب وتقارير يومية.",
    stats: [
      { icon: Monitor, label: "الأجهزة", value: "24" },
      { icon: Clock3, label: "جلسات اليوم", value: "87" },
      { icon: Wallet, label: "إيرادات اليوم", value: "2,340 ر.س" },
      { icon: Users, label: "الموظفون", value: "9" },
    ],
    tableTitle: "أحدث الجلسات",
    rows: [
      ["PC-03", "جلسة إنترنت", "اليوم", "15 ر.س"],
      ["PC-07", "ساعة ألعاب", "اليوم", "20 ر.س"],
      ["PC-01", "جلسة دراسة", "أمس", "12 ر.س"],
      ["PC-09", "طباعة + جلسة", "أمس", "25 ر.س"],
    ],
  },
  {
    key: "hospital",
    icon: Bed,
    name: "نظام المستشفى",
    tagline: "إدارة المرضى والمواعيد والأسرّة والفواتير والأقسام الطبية.",
    stats: [
      { icon: Users, label: "المرضى", value: "1,240" },
      { icon: CalendarDays, label: "المواعيد اليوم", value: "56" },
      { icon: Bed, label: "الأسرّة المشغولة", value: "87/120" },
      { icon: Wallet, label: "إيرادات الشهر", value: "186,000 ر.س" },
    ],
    tableTitle: "أحدث الحالات",
    rows: [
      ["P-4821", "محمد عبدالله", "الطب الباطني", "650 ر.س"],
      ["P-4820", "سارة أحمد", "الجراحة العامة", "2,100 ر.س"],
      ["P-4819", "علي حسن", "طب الأطفال", "320 ر.س"],
      ["P-4818", "فاطمة محمد", "النسائية", "480 ر.س"],
    ],
  },
];

const PERKS = ["بدون تسجيل", "بدون بطاقة ائتمان", "بيانات تجريبية جاهزة"];

/* Standalone live demo systems: linked directly (proxied same-origin) instead
   of the 3-day trial flow. */
const LIVE_KEYS = new Set<SystemKey>(["grocery", "clinic", "cafe", "hospital"]);

const LIVE_HREF: Record<string, string> = {
  grocery: "/grocery",
  clinic: "/sama",
  cafe: "/celia",
  hospital: "/hospital",
};

const LIVE_LABEL: Record<string, string> = {
  grocery: "افتح نظام البقالة",
  clinic: "افتح نظام سما سنتر",
  cafe: "افتح نظام كافيه اوس",
  hospital: "افتح نظام المستشفى",
};

function formatDays(days: number, hours: number): string {
  if (days > 0) {
    return `${days} ${days === 1 ? "يوم" : days === 2 ? "يومان" : "أيام"}${hours > 0 ? ` و${hours} ساعة` : ""}`;
  }
  return `${hours} ساعة`;
}

export default function DemoPage() {
  const trial = useSyncExternalStore(subscribeDemoTrial, readDemoTrial, () => null);
  const [picked, setPicked] = useState<SystemKey>("grocery");
  const [now, setNow] = useState<Date>(() => new Date());

  // Keep the countdown ticking once a minute while the trial is active.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const activeTrial = trial && !isDemoExpired(trial, now) ? trial : null;
  const system = SYSTEMS.find((s) => s.key === picked) ?? SYSTEMS[0];

  // Only non-live picks use the trial flow; live demo systems link out.
  const handleStart = (s: SystemKey) => {
    if (s === "grocery" || s === "clinic") startDemoTrial(s);
  };

  return (
    <OnboardingShell>
      <main dir="rtl">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:px-6">
          {!trial ? (
            <StartView picked={picked} setPicked={setPicked} onStart={handleStart} />
          ) : activeTrial ? (
            <ActiveView trial={activeTrial} now={now} system={system} setPicked={setPicked} />
          ) : (
            <ExpiredView />
          )}
        </div>
      </main>
    </OnboardingShell>
  );
}

/* ── Start screen (no signup) ───────────────────────────── */

function StartView({
  picked,
  setPicked,
  onStart,
}: {
  picked: SystemKey;
  setPicked: (s: SystemKey) => void;
  onStart: (s: SystemKey) => void;
}) {
  const system = SYSTEMS.find((s) => s.key === picked) ?? SYSTEMS[0];
  return (
    <div className="mb-10 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm text-primary">
        <Zap className="h-4 w-4" />
        تجربة مجانية لمدة 3 أيام
      </div>
      <h1 className="text-4xl font-extrabold text-white sm:text-5xl">جرّب Business OS مجاناً</h1>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
        استكشف الأنظمة الكاملة ببيانات تجريبية حية — بدون تسجيل وبدون بطاقة ائتمان.
        أنشئ حسابك فقط عندما تريد حفظ بياناتك الحقيقية.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/70">
        {PERKS.map((perk) => (
          <span key={perk} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {perk}
          </span>
        ))}
      </div>

      {/* System picker */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SYSTEMS.map((s) => (
          <button
            key={s.key}
            onClick={() => setPicked(s.key)}
            className={`group rounded-2xl border p-6 text-start backdrop-blur-xl transition-all ${
              picked === s.key
                ? "border-primary/60 bg-primary/15 shadow-lg shadow-primary/10"
                : "border-white/[0.08] bg-white/[0.03] hover:border-primary/30"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              {LIVE_KEYS.has(s.key) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  يعمل الآن
                </span>
              )}
            </div>
            <div className="text-lg font-bold text-white">{s.name}</div>
            <p className="mt-1 text-sm text-white/60">{s.tagline}</p>
          </button>
        ))}
      </div>

{LIVE_KEYS.has(picked) ? (
        <>
          <a
            href={LIVE_HREF[picked]}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-10 inline-flex items-center gap-2.5 rounded-2xl bg-primary px-10 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:shadow-2xl hover:brightness-110 active:scale-[0.98]"
          >
            <system.icon className="h-5 w-5" />
            {LIVE_LABEL[picked]}
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1 rtl:rotate-180" />
          </a>
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/50">
            بيانات الدخول التجريبية:<span className="font-mono text-white/70">demo</span> /{" "}
            <span className="font-mono text-white/70">demo123</span>
          </div>
        </>
      ) : (
        <button
          onClick={() => onStart(picked)}
          className="group mt-10 inline-flex items-center gap-2.5 rounded-2xl bg-primary px-10 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:shadow-2xl hover:brightness-110 active:scale-[0.98]"
        >
          <Timer className="h-5 w-5" />
          ابدأ النسخة التجريبية مجاناً — 3 أيام
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1 rtl:rotate-180" />
        </button>
      )}
      <p className="mt-4 text-xs text-white/40">
        {LIVE_KEYS.has(picked)
          ? "النظام متاح مباشرة بنسخة كاملة ببيانات تجريبية حية."
          : "نسختك التجريبية تبدأ الآن وتنتهي تلقائياً بعد 3 أيام — نُخزّن تقدمك على جهازك فقط."}
      </p>
    </div>
  );
}

/* ── Active trial: the demo workspace + countdown ───────── */

function ActiveTrialBanner({ trial, now }: { trial: DemoTrial; now: Date }) {
  const { days, hours } = demoRemainingParts(trial, now);
  const elapsed = 1 - demoRemainingPartsToFraction(trial, now);

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/[0.08] p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Timer className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">نسختك التجريبية نشطة — بدون تسجيل</div>
          <div className="mt-0.5 text-xs text-white/60">
            متبقّي {formatDays(days, hours)} من 3 أيام · {trial.system === "store" ? "متجر تجريبي" : trial.system === "grocery" ? "نظام بقاله" : trial.system === "clinic" ? "نظام علاج طبيعي" : "نظام اداره المقاهي"}
          </div>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10 sm:w-56">
            <div
              className="h-full rounded-full bg-gradient-to-l from-primary to-[#03EABC] transition-all duration-1000"
              style={{ width: `${Math.min(100, Math.max(6, elapsed * 100))}%` }}
            />
          </div>
        </div>
      </div>
      <Link
        href="/signup"
        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-white"
      >
        احتفظ ببياناتك لاحقاً — أنشئ حساباً
      </Link>
    </div>
  );
}

/** Fraction of the trial already used (0..1). */
function demoRemainingPartsToFraction(trial: DemoTrial, now: Date): number {
  const total = DEMO_DURATION_MS;
  const used = now.getTime() - new Date(trial.startedAt).getTime();
  return Math.min(1, Math.max(0, used / total));
}

function ActiveView({
  trial,
  now,
  system,
  setPicked,
}: {
  trial: DemoTrial;
  now: Date;
  system: SystemDef;
  setPicked: (s: SystemKey) => void;
}) {
  return (
    <>
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm text-primary">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          وضع العرض التجريبي — نشط مجاناً
        </div>
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl">تجربة الأنظمة مباشرة</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
          استكشف أنظمة Business OS ببيانات تجريبية حية، ثم أنشئ حسابك لتبدأ نظامك الحقيقي.
        </p>
      </div>

      <ActiveTrialBanner trial={trial} now={now} />

      {/* System tabs */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
        {SYSTEMS.map((s) =>
          LIVE_KEYS.has(s.key) ? (
            <a
              key={s.key}
              href={LIVE_HREF[s.key]}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold backdrop-blur-xl transition-all ${
                system.key === s.key
                  ? "border-primary/60 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                  : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-primary/30 hover:text-white"
              }`}
            >
              <s.icon className="h-5 w-5" />
              {s.name}
            </a>
          ) : (
            <button
              key={s.key}
              onClick={() => setPicked(s.key)}
              className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold backdrop-blur-xl transition-all ${
                system.key === s.key
                  ? "border-primary/60 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                  : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-primary/30 hover:text-white"
              }`}
            >
              <s.icon className="h-5 w-5" />
              {s.name}
            </button>
          ),
        )}
      </div>

      {/* Demo dashboard */}
      {LIVE_EMBED_HREF[system.key] ? (
        <LiveEmbed system={system} />
      ) : (
        <StaticDashboard system={system} />
      )}

      {/* CTA */}
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
        >
          أنشئ حسابك واحتفظ ببياناتك
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <Link href="/systems" className="text-sm text-white/60 hover:text-white">
          اختر نظامك وابدأ من الصفر بدلاً من ذلك
        </Link>
      </div>
    </>
  );
}

/* ── Live embed vs static demo dashboards ─────────────── */

/** Systems whose real standalone app is embedded live via iframe. */
const LIVE_EMBED_HREF: Record<string, string> = {
  grocery: "/grocery",
  hospital: "/hospital",
};

function LiveEmbed({ system }: { system: SystemDef }) {
  const href = LIVE_EMBED_HREF[system.key];
  if (!href) return null;
  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <system.icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{system.name}</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                النسخة الحية
              </span>
            </div>
            <p className="text-xs text-white/60">
              بيانات الدخول التجريبية: <span className="font-mono text-white/70">demo</span> /{" "}
              <span className="font-mono text-white/70">demo123</span>
            </p>
          </div>
        </div>
        <a
          href={LIVE_HREF[system.key]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.98]"
        >
          افتح في تبويب جديد
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <iframe
        src={href}
        title={system.name}
        className="h-[560px] w-full bg-white sm:h-[680px] lg:h-[760px]"
      />
      <p className="border-t border-white/[0.08] px-5 py-3 text-center text-xs text-white/40">
        البيانات المعروضة تجريبية لأغراض العرض فقط — نظامك الحقيقي يبدأ فور إنشاء حسابك.
      </p>
    </div>
  );
}

function StaticDashboard({ system }: { system: SystemDef }) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <system.icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{system.name}</h2>
            <p className="text-sm text-white/60">{system.tagline}</p>
          </div>
        </div>
        <Link
          href="/signup"
          className="group inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:shadow-2xl hover:brightness-110 active:scale-[0.98]"
        >
          ابدأ نسختك الحقيقية مجاناً
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 rtl:rotate-180" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {system.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 transition-all hover:border-primary/40"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-extrabold text-white">{stat.value}</div>
            <div className="mt-1 text-sm text-white/60">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <div className="border-b border-white/[0.08] px-5 py-4 font-semibold text-white">{system.tableTitle}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.03] text-white/50">
                {system.rows[0].map((_, i) => (
                  <th key={i} className="px-5 py-3 text-start font-medium">
                    العمود {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {system.rows.map((row, i) => (
                <tr key={i} className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.03]">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-5 py-3 text-white/80 ${j === 0 ? "font-semibold text-white" : ""}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-white/40">
        البيانات المعروضة تجريبية لأغراض العرض فقط — نظامك الحقيقي يبدأ فور إنشاء حسابك.
      </p>
    </div>
  );
}

/* ── Expired trial ──────────────────────────────────────── */

function ExpiredView() {
  return (
    <div className="mb-10 text-center">
      <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10 text-primary">
        <Lock className="h-10 w-10" />
      </div>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-sm text-white/50">
        انتهت النسخة التجريبية
      </div>
      <h1 className="text-4xl font-extrabold text-white sm:text-5xl">انتهت أيام النسخة المجانية</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
        شكراً لتجربة Business OS! أنشئ حسابك خلال دقيقة وبلا بطاقة ائتمان
        لتبدأ نظامك الحقيقي ببياناتك الخاصة.
      </p>
      <Link
        href="/signup"
        className="group mt-10 inline-flex items-center gap-2.5 rounded-2xl bg-primary px-10 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:shadow-2xl hover:brightness-110 active:scale-[0.98]"
      >
        إنشاء حساب جديد — مجاناً
        <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1 rtl:rotate-180" />
      </Link>
      <p className="mt-4 text-xs text-white/40">
        ابدأ مجدداً على جهاز آخر إذا أردت تجربة أخرى.
      </p>
    </div>
  );
}