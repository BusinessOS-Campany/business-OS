"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PlusIcon, Trash2Icon, Loader2Icon, UserRoundPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPatientAction } from "@/actions/patients";
import { toast } from "sonner";

interface City {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface Governorate extends City {
  cities: City[];
}

interface AllergyRow {
  allergen: string;
  reaction: string;
  severity: string;
}

const BLOOD_GROUPS = [
  "UNKNOWN",
  "A_POS",
  "A_NEG",
  "B_POS",
  "B_NEG",
  "AB_POS",
  "AB_NEG",
  "O_POS",
  "O_NEG",
] as const;

const MARITAL = ["UNKNOWN", "SINGLE", "MARRIED", "DIVORCED", "WIDOWED"] as const;

const VISIT_SOURCES = ["WALK_IN", "SCHEDULED", "REFERRAL", "EMERGENCY"] as const;

const SEVERITIES = ["MILD", "MODERATE", "SEVERE"] as const;

const BLOOD_KEY: Record<string, string> = {
  UNKNOWN: "bgUnknown",
  A_POS: "bgAPos",
  A_NEG: "bgANeg",
  B_POS: "bgBPos",
  B_NEG: "bgBNeg",
  AB_POS: "bgABPos",
  AB_NEG: "bgABNeg",
  O_POS: "bgOPos",
  O_NEG: "bgONeg",
};

const MARITAL_KEY: Record<string, string> = {
  UNKNOWN: "maritalUnknown",
  SINGLE: "maritalSingle",
  MARRIED: "maritalMarried",
  DIVORCED: "maritalDivorced",
  WIDOWED: "maritalWidowed",
};

const VISIT_KEY: Record<string, string> = {
  WALK_IN: "visitSourceWalkIn",
  SCHEDULED: "visitSourceScheduled",
  REFERRAL: "visitSourceReferral",
  EMERGENCY: "visitSourceUrgent",
};

const SEVERITY_KEY: Record<string, string> = {
  MILD: "severityMild",
  MODERATE: "severityModerate",
  SEVERE: "severitySevere",
};

export function PatientForm({ locations, locale }: { locations: Governorate[]; locale: string }) {
  const t = useTranslations("patients");
  const tc = useTranslations("common");
  const router = useRouter();

  const [state, action, pending] = useActionState(createPatientAction, null);
  const [isPending, startTransition] = useTransition();

  const [governorateId, setGovernorateId] = React.useState("");
  const [cityId, setCityId] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [bloodGroup, setBloodGroup] = React.useState("UNKNOWN");
  const [maritalStatus, setMaritalStatus] = React.useState("UNKNOWN");
  const [preferredLanguage, setPreferredLanguage] = React.useState("ar");
  const [visitSource, setVisitSource] = React.useState("WALK_IN");
  const [allergies, setAllergies] = React.useState<AllergyRow[]>([]);

  const governorate = locations.find((g) => g.id === governorateId);

  React.useEffect(() => {
    if (state?.ok && state.data?.id) {
      toast.success(t("createdTitle") + " ✓");
      router.push(`/patients/${state.data.id}`);
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  const busy = pending || isPending;

  const addAllergy = () =>
    setAllergies((prev) => [...prev, { allergen: "", reaction: "", severity: "MODERATE" }]);
  const removeAllergy = (i: number) =>
    setAllergies((prev) => prev.filter((_, idx) => idx !== i));
  const patchAllergy = (i: number, patch: Partial<AllergyRow>) =>
    setAllergies((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const userLocaleName = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="governorateId" value={governorateId} />
      <input type="hidden" name="cityId" value={cityId} />
      <input type="hidden" name="bloodGroup" value={bloodGroup} />
      <input type="hidden" name="maritalStatus" value={maritalStatus} />
      <input type="hidden" name="preferredLanguage" value={preferredLanguage} />
      <input type="hidden" name="visitSource" value={visitSource} />
      {allergies.map((a, i) => (
        <input key={`sev-${i}`} type="hidden" name="severities" value={a.severity} />
      ))}

      <section className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nameAr">{t("fullNameAr")}</Label>
            <Input id="nameAr" name="nameAr" required placeholder="اسم المريض الكامل" dir="rtl" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nameEn">{t("fullNameEn")}</Label>
            <Input id="nameEn" name="nameEn" required placeholder="Full name" dir="ltr" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{tc("gender")}</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={tc("gender")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">{tc("male")}</SelectItem>
                <SelectItem value="FEMALE">{tc("female")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dateOfBirth">{t("dateOfBirth")}</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">{t("primaryPhone")}</Label>
            <Input id="phone" name="phone" type="tel" dir="ltr" placeholder="+967 7X XXX XXXX" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
            <Input id="whatsapp" name="whatsapp" type="tel" dir="ltr" placeholder="+967 7X XXX XXXX" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="secondaryPhone">{t("secondaryPhone")}</Label>
            <Input id="secondaryPhone" name="secondaryPhone" type="tel" dir="ltr" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{tc("email")}</Label>
            <Input id="email" name="email" type="email" dir="ltr" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("governorate")}</Label>
            <Select
              value={governorateId}
              onValueChange={(v) => {
                setGovernorateId(v);
                setCityId("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("governorate")} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {userLocaleName(g.nameAr, g.nameEn)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("city")}</Label>
            <Select value={cityId} onValueChange={setCityId} disabled={!governorateId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={governorateId ? t("city") : "—"} />
              </SelectTrigger>
              <SelectContent>
                {(governorate?.cities ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {userLocaleName(c.nameAr, c.nameEn)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="address">{t("address")}</Label>
              <Textarea id="address" name="address" rows={2} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label>{t("bloodGroup")}</Label>
          <Select value={bloodGroup} onValueChange={setBloodGroup}>
            <SelectTrigger className="w-full">
              <SelectValue>{t(BLOOD_KEY[bloodGroup])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BLOOD_GROUPS.map((bg) => (
                <SelectItem key={bg} value={bg}>
                  {t(BLOOD_KEY[bg])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t("maritalStatus")}</Label>
          <Select value={maritalStatus} onValueChange={setMaritalStatus}>
            <SelectTrigger className="w-full">
              <SelectValue>{t(MARITAL_KEY[maritalStatus])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MARITAL.map((m) => (
                <SelectItem key={m} value={m}>
                  {t(MARITAL_KEY[m])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t("visitSource")}</Label>
          <Select value={visitSource} onValueChange={setVisitSource}>
            <SelectTrigger className="w-full">
              <SelectValue>{t(VISIT_KEY[visitSource])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {VISIT_SOURCES.map((v) => (
                <SelectItem key={v} value={v}>
                  {t(VISIT_KEY[v])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t("preferredLanguage")}</Label>
          <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {preferredLanguage === "ar" ? t("prefLanguageAr") : t("prefLanguageEn")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">{t("prefLanguageAr")}</SelectItem>
              <SelectItem value="en">{t("prefLanguageEn")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="occupation">{t("occupation")}</Label>
          <Input id="occupation" name="occupation" />
        </div>
        <div className="flex flex-col gap-2 lg:col-span-1">
          <Label htmlFor="nationalId">{t("nationalId")}</Label>
          <Input id="nationalId" name="nationalId" dir="ltr" placeholder="XXXX XXXXXXXX" />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium">{t("emergencyInfo")}</h3>
          <p className="text-xs text-muted-foreground">{t("emergencyHint")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="emergencyContactName">{t("contactName")}</Label>
            <Input id="emergencyContactName" name="emergencyContactName" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="emergencyContactRelation">{t("relationship")}</Label>
            <Input id="emergencyContactRelation" name="emergencyContactRelation" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="emergencyContactPhone">{t("contactPhone")}</Label>
            <Input id="emergencyContactPhone" name="emergencyContactPhone" type="tel" dir="ltr" />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">{t("allergies")}</h3>
            <p className="text-xs text-muted-foreground">{t("noAllergies")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addAllergy} className="gap-1.5">
            <PlusIcon className="size-3.5" />
            {t("addAllergy")}
          </Button>
        </div>
        {allergies.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noAllergies")}</p>
        ) : (
          <div className="space-y-3">
            {allergies.map((a, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor={`allergen-${i}`}>{t("allergen")}</Label>
                  <Input
                    id={`allergen-${i}`}
                    name="allergens"
                    value={a.allergen}
                    onChange={(e) => patchAllergy(i, { allergen: e.target.value })}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor={`reaction-${i}`}>{t("reaction")}</Label>
                  <Input
                    id={`reaction-${i}`}
                    name="reactions"
                    value={a.reaction}
                    onChange={(e) => patchAllergy(i, { reaction: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("severity")}</Label>
                  <Select value={a.severity} onValueChange={(v) => patchAllergy(i, { severity: v })}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue>{t(SEVERITY_KEY[a.severity])}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(SEVERITY_KEY[s])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeAllergy(i)}
                    aria-label={tc("delete")}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={busy} className="gap-2">
          {busy ? <Loader2Icon className="size-4 animate-spin" /> : <UserRoundPlus className="size-4" />}
          {busy ? tc("saving") : t("registerNew")}
        </Button>
      </div>
    </form>
  );
}