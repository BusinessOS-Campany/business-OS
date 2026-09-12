import type { Locale } from "@/lib/i18n/dictionary";
import { localizedName, localizedDescription } from "@/lib/i18n/localized";
import { MapPin, Phone, Mail, MessageCircle, Send, ExternalLink } from "lucide-react";
import Link from "next/link";

interface StoreData {
  name: string | null;
  nameEn: string | null;
  slug: string | null;
  description: string | null;
  descriptionEn: string | null;
  logo: string | null;
  cover: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lat: any;
  lng: any;
  whatsapp: string | null;
  telegram: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  tiktok: string | null;
  user: { id: string; name: string | null; image: string | null };
}

export function StoreHeader({ store, locale }: { store: StoreData; locale: Locale }) {
  const name = localizedName({ name: store.name || "", nameEn: store.nameEn }, locale) || store.user?.name || "متجر";
  const description = localizedDescription({ description: store.description, descriptionEn: store.descriptionEn }, locale) || "";

  const socialLinks = [
    { href: store.whatsapp ? `https://wa.me/${store.whatsapp.replace(/^\+/, "")}` : null, icon: MessageCircle, label: "WhatsApp" },
    { href: store.telegram ? `https://t.me/${store.telegram.replace(/^@/, "")}` : null, icon: Send, label: "Telegram" },
    { href: store.instagram ? `https://instagram.com/${store.instagram.replace(/^@/, "")}` : null, icon: ExternalLink, label: "Instagram" },
    { href: store.facebook ? `https://facebook.com/${store.facebook.replace(/^@/, "")}` : null, icon: ExternalLink, label: "Facebook" },
    { href: store.twitter ? `https://twitter.com/${store.twitter.replace(/^@/, "")}` : null, icon: ExternalLink, label: "Twitter" },
    { href: store.tiktok ? `https://tiktok.com/@${store.tiktok.replace(/^@/, "")}` : null, icon: ExternalLink, label: "TikTok" },
  ].filter((s) => s.href);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-10">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5 border border-border">
        {store.cover && (
          <div className="absolute inset-0 -z-10">
            <img src={store.cover} alt="" className="h-full w-full object-cover opacity-20" />
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-10">
          {store.logo ? (
            <img src={store.logo} alt={name} className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl object-cover border-4 border-background shadow-lg" />
          ) : (
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-muted flex items-center justify-center text-4xl font-bold text-muted-foreground border-4 border-background shadow-lg">
              {name.charAt(0)}
            </div>
          )}
          <div className="text-center sm:text-right space-y-3 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">{name}</h1>
            {description && <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">{description}</p>}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground justify-center sm:justify-start">
              {store.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {store.address}
                </span>
              )}
              {store.phone && (
                <Link href={`tel:${store.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Phone className="h-3.5 w-3.5" /> {store.phone}
                </Link>
              )}
              {store.email && (
                <Link href={`mailto:${store.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Mail className="h-3.5 w-3.5" /> {store.email}
                </Link>
              )}
            </div>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                {socialLinks.map((s) => (
                  <Link key={s.label} href={s.href!} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors" title={s.label}>
                    <s.icon className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
