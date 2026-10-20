"use client";
import { useState, useEffect, useRef } from "react";
import { Store, Save, Upload, Link, Phone, Mail, MapPin, Globe, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";

interface StoreProfile {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  logo: string;
  cover: string;
  phone: string;
  email: string;
  address: string;
  lat: string;
  lng: string;
  whatsapp: string;
  telegram: string;
  instagram: string;
  facebook: string;
  twitter: string;
  tiktok: string;
  shippingAddress: string;
}

const emptyProfile: StoreProfile = {
  name: "",
  nameEn: "",
  description: "",
  descriptionEn: "",
  logo: "",
  cover: "",
  phone: "",
  email: "",
  address: "",
  lat: "",
  lng: "",
  whatsapp: "",
  telegram: "",
  instagram: "",
  facebook: "",
  twitter: "",
  tiktok: "",
  shippingAddress: "",
};

export default function MerchantStorePage() {
  const { t, direction } = useI18n();
  const [profile, setProfile] = useState<StoreProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/merchant/store")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        const sanitized = { ...emptyProfile };
        for (const key of Object.keys(emptyProfile) as (keyof StoreProfile)[]) {
          sanitized[key] = data[key] ?? "";
        }
        setProfile(sanitized);
        setLoading(false);
      })
      .catch(() => {
        setMessage({ type: "error", text: t("merchant.load_error") });
        setLoading(false);
      });
  }, [t]);

  const update = (field: keyof StoreProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpload = async (field: "logo" | "cover", file: File) => {
    setUploading(field);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/merchant/store/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      update(field, url);
    } catch {
      setMessage({ type: "error", text: t("merchant.upload_error") });
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/merchant/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: t("merchant.saved") });
    } catch {
      setMessage({ type: "error", text: t("merchant.save_error") });
    } finally {
      setSaving(false);
    }
  };

  const socialFields: { key: keyof StoreProfile; icon: typeof Globe; label: string }[] = [
    { key: "whatsapp", icon: Link, label: "WhatsApp" },
    { key: "telegram", icon: Link, label: "Telegram" },
    { key: "instagram", icon: Link, label: "Instagram" },
    { key: "facebook", icon: Link, label: "Facebook" },
    { key: "twitter", icon: Link, label: "Twitter" },
    { key: "tiktok", icon: Link, label: "TikTok" },
  ];

  if (loading) {
    return (
      <div dir={direction} className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir={direction} className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            {t("merchant.store_settings")}
          </h1>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("merchant.basic_info")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t("merchant.store_name")}
                value={profile.name}
                onChange={(e) => update("name", e.target.value)}
              />
              <Input
                label={t("merchant.store_name_en")}
                value={profile.nameEn}
                onChange={(e) => update("nameEn", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Textarea
                label={t("merchant.description")}
                value={profile.description}
                onChange={(e) => update("description", e.target.value)}
              />
              <Textarea
                label={t("merchant.description_en")}
                value={profile.descriptionEn}
                onChange={(e) => update("descriptionEn", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("merchant.media")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                {t("merchant.logo_url")}
              </label>
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-24 rounded-lg border border-border bg-muted overflow-hidden flex-shrink-0">
                  {profile.logo ? (
                    <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Image className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload("logo", file);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={uploading === "logo"}>
                    {uploading === "logo" ? t("merchant.uploading") : t("merchant.choose_logo")}
                  </Button>
                  {profile.logo && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => update("logo", "")}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Input
                    value={profile.logo}
                    onChange={(e) => update("logo", e.target.value)}
                    placeholder={t("merchant.or_paste_url")}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                {t("merchant.cover_url")}
              </label>
              <div className="flex items-start gap-4">
                <div className="relative w-full h-32 rounded-lg border border-border bg-muted overflow-hidden flex-shrink-0 max-w-[200px]">
                  {profile.cover ? (
                    <img src={profile.cover} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Image className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={coverRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload("cover", file);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => coverRef.current?.click()} disabled={uploading === "cover"}>
                    {uploading === "cover" ? t("merchant.uploading") : t("merchant.choose_cover")}
                  </Button>
                  {profile.cover && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => update("cover", "")}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Input
                    value={profile.cover}
                    onChange={(e) => update("cover", e.target.value)}
                    placeholder={t("merchant.or_paste_url")}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {t("merchant.contact_info")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t("merchant.phone")}
                value={profile.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
              <Input
                label={t("merchant.email")}
                type="email"
                value={profile.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <Textarea
              label={t("merchant.address")}
              value={profile.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("merchant.store_location")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t("merchant.latitude")}
                type="number"
                step="any"
                value={profile.lat}
                onChange={(e) => update("lat", e.target.value)}
                placeholder={t("merchant.lat_placeholder")}
              />
              <Input
                label={t("merchant.longitude")}
                type="number"
                step="any"
                value={profile.lng}
                onChange={(e) => update("lng", e.target.value)}
                placeholder={t("merchant.lng_placeholder")}
              />
            </div>
            {profile.lat && profile.lng && (
              <div className="rounded-lg overflow-hidden border border-border h-48">
                <iframe
                  src={`https://maps.google.com/maps?q=${profile.lat},${profile.lng}&z=14&output=embed`}
                  className="w-full h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("merchant.coords_help")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t("merchant.social_links")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {socialFields.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  value={profile[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                  placeholder="https://..."
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("merchant.shipping_address")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={profile.shippingAddress}
              onChange={(e) => update("shippingAddress", e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={saving}>
            <Save className="h-4 w-4 ms-2" />
            {t("merchant.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
