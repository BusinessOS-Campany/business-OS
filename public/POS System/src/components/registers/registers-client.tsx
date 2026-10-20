"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Plus, X, LogIn, LogOut } from "lucide-react";

interface SessionRow {
  id: string; status: string; openedAt: string; closedAt: string | null;
  openingCash: number; expectedCash: number; actualCash: number; difference: number; note: string;
  branchName: string; userName: string; closedByName: string;
}
interface Opt { id: string; name: string }

function L(lang: "ar" | "en", ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

export function RegistersClient({
  lang, selfId, sessions, branches, terminals,
}: {
  lang: "ar" | "en"; selfId: string; sessions: SessionRow[]; branches: Opt[]; terminals: Opt[];
}) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);
  const [closeFor, setCloseFor] = useState<SessionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ branchId: "", terminalId: "", openingCash: "", note: "" });
  const [closeForm, setCloseForm] = useState({ actualCash: "", note: "" });

  const openSessions = sessions.filter((s) => s.status === "OPEN");
  const closedSessions = sessions.filter((s) => s.status !== "OPEN");

  async function openRegister() {
    if (busy) return;
    setError("");
    const openingCash = parseFloat(form.openingCash || "0");
    if (isNaN(openingCash) || openingCash < 0) {
      setError(L(lang, "أدخل قيمة صحيحة", "Enter a valid opening cash"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/pos/api/registers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, openingCash, terminalId: form.terminalId || undefined }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error === "already_open" ? L(lang, "لديك صندوق مفتوح بالفعل", "You already have an open register") : L(lang, "تعذر الفتح", "Could not open"));
        return;
      }
      setOpenModal(false);
      setForm({ branchId: "", terminalId: "", openingCash: "", note: "" });
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  async function closeRegister() {
    if (!closeFor || busy) return;
    setError("");
    const actualCash = parseFloat(closeForm.actualCash);
    if (isNaN(actualCash) || actualCash < 0) {
      setError(L(lang, "أدخل المبلغ الفعلي", "Enter actual cash"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/pos/api/registers/${closeFor.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualCash, note: closeForm.note }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error === "not_open" ? L(lang, "الصندوق مغلق بالفعل", "Register already closed") : L(lang, "تعذر الإغلاق", "Could not close"));
        return;
      }
      setCloseFor(null);
      setCloseForm({ actualCash: "", note: "" });
      router.refresh();
    } catch {
      setError(L(lang, "حدث خطأ في الاتصال", "Network error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Store className="h-5 w-5 text-emerald-600" />
            {L(lang, "صناديق النقد", "Cash registers")}
          </h2>
          <p className="text-sm text-muted-foreground">{L(lang, "فتح وإغلاق الصناديق", "Open and close register sessions")}</p>
        </div>
        <button onClick={() => { setOpenModal(true); setError(""); }} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          {L(lang, "فتح صندوق", "Open register")}
        </button>
      </div>

      {openSessions.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{L(lang, "صناديق مفتوحة", "Open registers")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {openSessions.map((s) => (
              <div key={s.id} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                      <LogIn className="h-4 w-4" />
                      {s.branchName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.userName} · {new Date(s.openedAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => { setCloseFor(s); setCloseForm({ actualCash: "", note: "" }); setError(""); }} className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
                    <LogOut className="h-3.5 w-3.5" />
                    {L(lang, "إغلاق", "Close")}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-card px-3 py-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">{L(lang, "رصيد الفتح", "Opening cash")}</p>
                    <p className="font-bold">{s.openingCash.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-card px-3 py-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">{L(lang, "متوقع", "Expected")}</p>
                    <p className="font-bold">{s.expectedCash.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{L(lang, "السجل", "History")}</h3>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">{L(lang, "الفرع", "Branch")}</th>
                  <th className="px-4 py-3 font-semibold">{L(lang, "الفترة", "Period")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{L(lang, "الفتح", "Opening")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{L(lang, "متوقع", "Expected")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{L(lang, "فعلي", "Actual")}</th>
                  <th className="px-4 py-3 text-end font-semibold">{L(lang, "الفرق", "Diff")}</th>
                  <th className="px-4 py-3 font-semibold">{L(lang, "مغلق بواسطة", "Closed by")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {closedSessions.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{L(lang, "لا يوجد سجل", "No history")}</td></tr>
                ) : closedSessions.slice(0, 60).map((s) => (
                  <tr key={s.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{s.branchName}</p>
                      <p className="text-xs text-muted-foreground">{s.userName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{new Date(s.openedAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{s.closedAt ? new Date(s.closedAt).toLocaleTimeString() : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-end">{s.openingCash.toLocaleString()}</td>
                    <td className="px-4 py-3 text-end">{s.expectedCash.toLocaleString()}</td>
                    <td className="px-4 py-3 text-end">{s.actualCash.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-end font-bold ${s.difference > 0 ? "text-emerald-600" : s.difference < 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                      {s.difference > 0 ? "+" : ""}{s.difference.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{s.closedByName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setOpenModal(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{L(lang, "فتح صندوق", "Open register")}</h3>
              <button onClick={() => setOpenModal(false)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <Field label={L(lang, "الفرع", "Branch")}>
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inputCls}>
                  {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                </select>
              </Field>
              <Field label={L(lang, "الجهاز", "Terminal")}>
                <select value={form.terminalId} onChange={(e) => setForm({ ...form, terminalId: e.target.value })} className={inputCls}>
                  <option value="">—</option>
                  {terminals.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </Field>
              <Field label={L(lang, "رصيد الفتح", "Opening cash")}><input type="number" value={form.openingCash} onChange={(e) => setForm({ ...form, openingCash: e.target.value })} className={inputCls} placeholder="0.00" /></Field>
              <Field label={L(lang, "ملاحظة", "Note")}><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls} /></Field>
            </div>
            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
            <button onClick={openRegister} disabled={busy || !form.branchId} className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
              {busy ? L(lang, "جارٍ الفتح…", "Opening…") : L(lang, "فتح", "Open")}
            </button>
          </div>
        </div>
      )}

      {closeFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !busy && setCloseFor(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{L(lang, "إغلاق صندوق", "Close register")}</h3>
              <button onClick={() => setCloseFor(null)} disabled={busy} className="rounded-md p-1 text-muted-foreground hover:bg-muted/60"><X className="h-4 w-4" /></button>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
              <p className="text-muted-foreground">{L(lang, "المتوقع حتى الآن", "Expected so far")}: <span className="font-bold text-foreground">{closeFor.expectedCash.toLocaleString()}</span></p>
            </div>
            <div className="mt-3 space-y-3">
              <Field label={L(lang, "الرصيد الفعلي", "Actual cash")}><input type="number" value={closeForm.actualCash} onChange={(e) => setCloseForm({ ...closeForm, actualCash: e.target.value })} className={inputCls} /></Field>
              <Field label={L(lang, "ملاحظة", "Note")}><input value={closeForm.note} onChange={(e) => setCloseForm({ ...closeForm, note: e.target.value })} className={inputCls} /></Field>
            </div>
            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
            <button onClick={closeRegister} disabled={busy} className="mt-4 w-full rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40">
              {busy ? L(lang, "جارٍ الإغلاق…", "Closing…") : L(lang, "إغلاق", "Close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none transition focus:border-emerald-500";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}