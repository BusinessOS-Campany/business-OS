"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserRoundPlus } from "lucide-react";
import { createEmployeeAction } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Option = { id: string; nameAr: string; nameEn: string };

type EmployeeFormProps = {
  locale: string;
  departments: Option[];
  positions: Option[];
  specialties: Option[];
  branches: Option[];
};

const EMPLOYEE_TYPES = [
  "DOCTOR",
  "NURSE",
  "PHARMACIST",
  "LAB_TECHNICIAN",
  "RADIOLOGIST",
  "RADIOLOGY_TECHNICIAN",
  "RECEPTIONIST",
  "ACCOUNTANT",
  "CASHIER",
  "HR",
  "ADMINISTRATOR",
  "CLEANER",
  "TECHNICIAN",
  "AMBULANCE_STAFF",
  "OTHER",
] as const;

const EMPLOYEE_TYPE_KEY: Record<string, string> = {
  DOCTOR: "employees.typeDoctor",
  NURSE: "employees.typeNurse",
  PHARMACIST: "employees.typePharmacist",
  LAB_TECHNICIAN: "employees.typeLabTechnician",
  RADIOLOGIST: "employees.typeRadiologist",
  RADIOLOGY_TECHNICIAN: "employees.typeOther",
  RECEPTIONIST: "employees.typeReceptionist",
  ACCOUNTANT: "employees.typeAccountant",
  CASHIER: "employees.typeCashier",
  HR: "employees.typeHR",
  ADMINISTRATOR: "employees.typeAdministrator",
  CLEANER: "employees.typeOther",
  TECHNICIAN: "employees.typeTechnician",
  AMBULANCE_STAFF: "employees.typeAmbulanceStaff",
  OTHER: "employees.typeOther",
};

const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"] as const;

const EMPLOYMENT_LABEL: Record<string, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERN: "Intern",
};

const EMPLOYEE_STATUSES = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"] as const;

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
};

type State = { ok: boolean; error?: string; id?: string } | null;

export function EmployeeForm({ locale, departments, positions, specialties, branches }: EmployeeFormProps) {
  const t = useTranslations();
  const tc = useTranslations("common");
  const router = useRouter();
  const [employeeType, setEmployeeType] = useState("OTHER");
  const [departmentId, setDepartmentId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [gender, setGender] = useState("");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [employeeStatus, setEmployeeStatus] = useState("ACTIVE");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createEmployeeAction(null, formData);
      if (res?.ok) {
        toast.success(tc("saved"));
        if (res.data?.id) router.push(`/employees/${res.data.id}`);
        else router.refresh();
        return { ok: true, id: res.data?.id };
      }
      return { ok: false, error: res?.error };
    },
    null
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRoundPlus className="size-4 text-primary" />
          {t("employees.new")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="employeeType" value={employeeType} />
          <input type="hidden" name="departmentId" value={departmentId} />
          <input type="hidden" name="positionId" value={positionId} />
          <input type="hidden" name="specialtyId" value={specialtyId} />
          <input type="hidden" name="branchId" value={branchId} />
          <input type="hidden" name="gender" value={gender} />
          <input type="hidden" name="employmentType" value={employmentType} />
          <input type="hidden" name="employeeStatus" value={employeeStatus} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name Ar *</Label>
              <Input name="nameAr" required className="h-8 text-sm" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name En *</Label>
              <Input name="nameEn" required className="h-8 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("employees.employeeType")}</Label>
            <Select value={employeeType} onValueChange={setEmployeeType}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(EMPLOYEE_TYPE_KEY[type])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("employees.department")}</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {locale === "ar" ? d.nameAr : d.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("employees.position")}</Label>
              <Select value={positionId} onValueChange={setPositionId}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {locale === "ar" ? p.nameAr : p.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("employees.specialty")}</Label>
              <Select value={specialtyId} onValueChange={setSpecialtyId}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {locale === "ar" ? s.nameAr : s.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {locale === "ar" ? b.nameAr : b.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("gender")}</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">{tc("male")}</SelectItem>
                  <SelectItem value="FEMALE">{tc("female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("employees.contractType")}</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue>{EMPLOYMENT_LABEL[employmentType]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((et) => (
                    <SelectItem key={et} value={et}>
                      {EMPLOYMENT_LABEL[et]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("status")}</Label>
              <Select value={employeeStatus} onValueChange={setEmployeeStatus}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue>{STATUS_LABEL[employeeStatus]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {STATUS_LABEL[st]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("employees.hireDate")}</Label>
              <Input name="hireDate" type="date" className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("phone")}</Label>
              <Input name="phone" type="tel" className="h-8 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("email")}</Label>
              <Input name="email" type="email" className="h-8 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">National ID</Label>
              <Input name="nationalId" className="h-8 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("employees.licenseNo")}</Label>
              <Input name="licenseNo" className="h-8 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("employees.baseSalary")}</Label>
              <Input name="baseSalary" type="number" step="0.01" min="0" className="h-8 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{tc("address")}</Label>
              <Input name="address" className="h-8 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{tc("notes")}</Label>
            <Textarea name="note" rows={2} className="text-sm" />
          </div>

          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : tc("error")}</p>
          )}

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? tc("saving") : t("employees.new")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}