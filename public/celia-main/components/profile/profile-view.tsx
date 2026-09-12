"use client";

import { useState } from "react";
import {
  AtSign,
  Calendar,
  CheckCircle2,
  KeyRound,
  Mail,
  Phone,
  Shield,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { profileUpdateSchema } from "@/lib/users/profile";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  username: string | null;
  displayUsername: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
}

interface ProfileViewProps {
  initialProfile: ProfileData;
}

interface FieldErrors {
  name?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const card = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function ProfileView({ initialProfile }: ProfileViewProps) {
  const { locale, t } = useLocale();
  const pp = t.profilePage;
  const um = t.usersManagement;

  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [firstName, setFirstName] = useState(
    initialProfile.name.split(" ")[0] ?? initialProfile.name,
  );
  const [lastName, setLastName] = useState(
    initialProfile.name.split(" ").slice(1).join(" "),
  );
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function roleLabel(value: string): string {
    const label = t.roles[value as keyof typeof t.roles];
    return label ?? value;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const name = [firstName, lastName].filter(Boolean).join(" ");
    if (!name.trim()) {
      setErrors({ name: pp.nameError });
      return;
    }
    if (newPassword && confirmPassword !== newPassword) {
      setErrors({ confirmPassword: pp.passwordMismatch });
      return;
    }

    const payload = {
      name,
      phone,
      currentPassword,
      newPassword,
    };
    const result = profileUpdateSchema(t).safeParse(payload);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors({
        name: fieldErrors.name?.[0],
        phone: fieldErrors.phone?.[0],
        currentPassword: fieldErrors.currentPassword?.[0],
        newPassword: fieldErrors.newPassword?.[0],
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify(result.data),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        error?: string;
        profile?: ProfileData;
      } | null;

      if (res.ok) {
        setMessage({ type: "success", text: data?.message ?? pp.profileUpdated });
        if (data?.profile) {
          setProfile(data.profile);
          setFirstName(data.profile.name.split(" ")[0] ?? data.profile.name);
          setLastName(data.profile.name.split(" ").slice(1).join(" "));
          setPhone(data.profile.phone ?? "");
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data?.error ?? um.invalidData });
      }
    } catch {
      setMessage({ type: "error", text: um.serverError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {message && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium",
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <section className={card}>
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-extrabold text-primary">
            {initials(profile.name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold text-foreground">{profile.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  profile.role === "admin"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-foreground",
                )}
              >
                <Shield className="size-3" aria-hidden="true" />
                {roleLabel(profile.role)}
              </span>
              {profile.username && (
                <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground" dir="ltr">
                  <AtSign className="size-3" aria-hidden="true" />
                  {profile.username}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={card}>
        <h3 className="mb-4 text-base font-extrabold text-foreground">{pp.accountInfo}</h3>
        <dl className="divide-y divide-border text-sm">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4" aria-hidden="true" />
              {pp.emailLabel}
            </dt>
            <dd className="tabular-nums text-foreground" dir="ltr">
              {profile.email}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <AtSign className="size-4" aria-hidden="true" />
              {pp.usernameLabel}
            </dt>
            <dd className="tabular-nums text-foreground" dir="ltr">
              {profile.username || "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4" aria-hidden="true" />
              {um.phoneLabel}
            </dt>
            <dd className="tabular-nums text-foreground" dir="ltr">
              {profile.phone || "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4" aria-hidden="true" />
              {pp.memberSince}
            </dt>
            <dd className="tabular-nums text-foreground">
              {new Date(profile.createdAt).toLocaleDateString(
                locale === "ar" ? "ar-EG" : "en-US",
                { year: "numeric", month: "long", day: "numeric" },
              )}
            </dd>
          </div>
        </dl>
      </section>

      <form onSubmit={handleSubmit} noValidate className={cn(card, "space-y-4")}>
        <h3 className="flex items-center gap-2 text-base font-extrabold text-foreground">
          <UserIcon className="size-4" aria-hidden="true" />
          {pp.personalInfo}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label={um.firstNameLabel}
            htmlFor="profile-first-name"
            error={errors.name}
            required
          >
            <Input
              id="profile-first-name"
              name="firstName"
              placeholder={um.firstNamePlaceholder}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              hasError={!!errors.name}
              disabled={loading}
            />
          </FormField>
          <FormField label={um.lastNameLabel} htmlFor="profile-last-name">
            <Input
              id="profile-last-name"
              name="lastName"
              placeholder={um.lastNamePlaceholder}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
            />
          </FormField>
        </div>

        <FormField label={um.phoneLabel} htmlFor="profile-phone" error={errors.phone}>
          <Input
            id="profile-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            placeholder={um.phonePlaceholder}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            hasError={!!errors.phone}
            disabled={loading}
          />
        </FormField>

        <div className="border-t border-border pt-4">
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <KeyRound className="size-4" aria-hidden="true" />
            {pp.changePassword}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">{pp.changePasswordHint}</p>

          <div className="mt-4 space-y-4">
            <FormField
              label={pp.currentPassword}
              htmlFor="profile-current-password"
              error={errors.currentPassword}
            >
              <Input
                id="profile-current-password"
                name="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                hasError={!!errors.currentPassword}
                disabled={loading}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={pp.newPassword}
                htmlFor="profile-new-password"
                error={errors.newPassword}
              >
                <Input
                  id="profile-new-password"
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  hasError={!!errors.newPassword}
                  disabled={loading}
                />
              </FormField>
              <FormField
                label={pp.confirmPassword}
                htmlFor="profile-confirm-password"
                error={errors.confirmPassword}
              >
                <Input
                  id="profile-confirm-password"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  hasError={!!errors.confirmPassword}
                  disabled={loading}
                />
              </FormField>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button type="submit" variant="primary" loading={loading}>
            {loading ? pp.saving : pp.save}
          </Button>
        </div>
      </form>
    </div>
  );
}
