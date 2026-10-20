"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, ShieldCheck, RotateCcw, Truck, Headphones, ChevronDown, MessageCircle, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

const trustItems = [
  { key: "secure_payment", icon: Lock },
  { key: "money_back", icon: ShieldCheck },
  { key: "free_returns", icon: RotateCcw },
  { key: "free_shipping", icon: Truck },
  { key: "contact_us", icon: Headphones },
] as const;

const faqKeys = [
  { q: "faq_1_q", a: "faq_1_a" },
  { q: "faq_2_q", a: "faq_2_a" },
  { q: "faq_3_q", a: "faq_3_a" },
  { q: "faq_4_q", a: "faq_4_a" },
] as const;

export function ProductTrust() {
  const { t } = useI18n();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Trust badges grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {trustItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm font-semibold">{t(`detail.${item.key}`)}</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">{t(`detail.${item.key}_desc`)}</span>
            </div>
          );
        })}
      </div>

      {/* Social media */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-bold mb-4">{t("detail.contact_us")}</h3>
        <div className="flex flex-wrap gap-3">
          <a href="https://whatsapp.com/channel/0029VbC16MPAjPXSlOlZD92I" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
            <MessageCircle className="h-4 w-4 text-green-500" />
            {t("detail.social_whatsapp")}
          </a>
          <a href="https://facebook.com/wanostore" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
            <ExternalLink className="h-4 w-4 text-blue-600" />
            {t("detail.social_facebook")}
          </a>
        </div>
      </div>

      {/* FAQ accordion */}
      <div>
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          {t("detail.faq")}
        </h3>
        <div className="space-y-2">
          {faqKeys.map((faq) => {
            const isOpen = openFaq === faq.q;
            return (
              <div key={faq.q} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : faq.q)}
                  className="flex w-full items-center justify-between p-4 text-sm font-semibold text-start hover:bg-muted/50 transition-colors"
                >
                  {t(`detail.${faq.q}`)}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                        {t(`detail.${faq.a}`)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
