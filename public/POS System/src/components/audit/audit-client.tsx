"use client";

import { useState } from "react";
import { ClipboardList, ChevronDown } from "lucide-react";

export interface LogRow {
  id: string; action: string; entity: string; entityId: string; ip: string;
  oldValue: unknown; newValue: unknown; createdAt: string; userName: string;
}

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

const ACTION: Record<string, { ar: string; en: string }> = {
  CREATE: { ar: "إنشاء", en: "Create" },
  UPDATE: { ar: "تعديل", en: "Update" },
  DELETE: { ar: "حذف", en: "Delete" },
  APPROVE: { ar: "اعتماد", en: "Approve" },
  REJECT: { ar: "رفض", en: "Reject" },
  OPEN: { ar: "فتح", en: "Open" },
  CLOSE: { ar: "إغلاق", en: "Close" },
  SUBMIT: { ar: "إرسال", en: "Submit" },
  RECEIVE: { ar: "استلام", en: "Receive" },
  CANCEL: { ar: "إلغاء", en: "Cancel" },
  PAY: { ar: "دفع", en: "Pay" },
  COLLECT: { ar: "تحصيل", en: "Collect" },
};

function actionLabel(lang: "ar" | "en", action: string) {
  const a = ACTION[action];
  return a ? (lang === "ar" ? a.ar : a.en) : action;
}

export function AuditClient({ lang, rows }: { lang: "ar" | "en"; rows: LogRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <ClipboardList className="h-5 w-5 text-emerald-600" />
          {L(lang, "سجل العمليات", "Audit Log")}
        </h2>
        <p className="text-sm text-muted-foreground">{L(lang, "تتبع التغييرات في النظام", "Track changes across the system")}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{L(lang, "الوقت", "Time")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "المستخدم", "User")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "الإجراء", "Action")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "الكيان", "Entity")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "المعرّف", "Id")}</th>
                <th className="px-4 py-3 font-semibold">{L(lang, "IP", "IP")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{L(lang, "لا توجد سجلات", "No records")}</td></tr>
              ) : rows.map((r) => (
                <>
                  <tr key={r.id} className="transition hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{r.userName || "—"}</td>
                    <td className="px-4 py-3"><span className={badgeCls(r.action)}>{actionLabel(lang, r.action)}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.entity}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.entityId || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.ip || "—"}</td>
                    <td className="px-4 py-3 text-end">
                      <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60">
                        <ChevronDown className={`h-4 w-4 transition ${expanded === r.id ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr className="bg-muted/30">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <JsonBox title={L(lang, "قبل", "Before")} value={r.oldValue} lang={lang} />
                          <JsonBox title={L(lang, "بعد", "After")} value={r.newValue} lang={lang} />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function badgeCls(action: string) {
  switch (action) {
    case "DELETE": case "REJECT": case "CANCEL": return "rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600";
    case "CREATE": case "RECEIVE": case "COLLECT": case "OPEN": return "rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600";
    case "APPROVE": case "SUBMIT": return "rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-600";
    default: return "rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground";
  }
}

function JsonBox({ title, value, lang }: { title: string; value: unknown; lang: "ar" | "en" }) {
  const empty = value === null || value === undefined || (typeof value === "object" && Object.keys(value as object).length === 0);
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{title}</p>
      {empty ? (
        <p className="text-xs text-muted-foreground">{lang === "ar" ? "لا يوجد" : "—"}</p>
      ) : (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(value, null, 2)}</pre>
      )}
    </div>
  );
}