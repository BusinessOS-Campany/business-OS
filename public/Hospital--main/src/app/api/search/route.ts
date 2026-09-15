import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, canAny } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });

  const take = 5;
  const results: {
    type: "patients" | "doctors" | "invoices" | "appointments" | "labs" | "rads" | "prescriptions";
    label: string;
    sublabel: string;
    href: string;
  }[] = [];

  const whereLike = (field: "nameAr" | "nameEn" | "mrn" | "code" | "title" | "number") => ({
    OR: [{ [field]: { contains: q, mode: "insensitive" as const } }],
  });

  if (canAny(user, "patients", ["read", "manage"])) {
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { nameAr: { contains: q, mode: "insensitive" } },
          { nameEn: { contains: q, mode: "insensitive" } },
          { mrn: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      select: { id: true, nameAr: true, nameEn: true, mrn: true },
    });
    for (const p of patients) {
      results.push({
        type: "patients",
        label: p.nameAr || p.nameEn || "",
        sublabel: p.mrn ?? "",
        href: `/patients/${p.id}`,
      });
    }
  }

  if (canAny(user, "employees", ["read", "manage"])) {
    const doctors = await prisma.employee.findMany({
      where: {
        employeeType: "DOCTOR",
        OR: [
          { nameAr: { contains: q, mode: "insensitive" } },
          { nameEn: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      select: { id: true, nameAr: true, nameEn: true, employeeNo: true, specialty: { select: { nameEn: true, nameAr: true } } },
    });
    for (const d of doctors) {
      results.push({
        type: "doctors",
        label: d.nameAr || d.nameEn || "",
        sublabel: d.specialty?.nameEn ?? "",
        href: `/employees/${d.id}`,
      });
    }
  }

  if (canAny(user, "billing", ["read", "manage"])) {
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNo: { contains: q, mode: "insensitive" } },
          { patient: { nameAr: { contains: q, mode: "insensitive" } } },
          { patient: { nameEn: { contains: q, mode: "insensitive" } } },
        ],
      },
      take,
      select: { id: true, invoiceNo: true, patient: { select: { nameAr: true, nameEn: true } } },
    });
    for (const inv of invoices) {
      results.push({
        type: "invoices",
        label: inv.invoiceNo ?? "",
        sublabel: inv.patient.nameAr || inv.patient.nameEn || "",
        href: `/billing/${inv.id}`,
      });
    }
  }

  if (canAny(user, "appointments", ["read", "manage"])) {
    const appts = await prisma.appointment.findMany({
      where: {
        OR: [
          { patient: { nameAr: { contains: q, mode: "insensitive" } } },
          { patient: { nameEn: { contains: q, mode: "insensitive" } } },
          { patient: { mrn: { contains: q, mode: "insensitive" } } },
        ],
      },
      take,
      orderBy: { scheduledAt: "desc" },
      select: {
        id: true,
        scheduledAt: true,
        patient: { select: { nameAr: true, nameEn: true, mrn: true } },
      },
    });
    for (const a of appts) {
      results.push({
        type: "appointments",
        label: a.patient.nameAr || a.patient.nameEn || "",
        sublabel: new Date(a.scheduledAt).toLocaleString(),
        href: `/appointments/${a.id}`,
      });
    }
  }

  if (canAny(user, "laboratory", ["read", "manage"])) {
    const labs = await prisma.labOrder.findMany({
      where: {
        OR: [
          { orderNo: { contains: q, mode: "insensitive" } },
          { patient: { nameAr: { contains: q, mode: "insensitive" } } },
          { patient: { nameEn: { contains: q, mode: "insensitive" } } },
        ],
      },
      take,
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNo: true, patient: { select: { nameAr: true, nameEn: true } } },
    });
    for (const l of labs) {
      results.push({
        type: "labs",
        label: l.orderNo ?? "",
        sublabel: l.patient.nameAr || l.patient.nameEn || "",
        href: `/laboratory/${l.id}`,
      });
    }
  }

  if (canAny(user, "radiology", ["read", "manage"])) {
    const rads = await prisma.radiologyOrder.findMany({
      where: {
        OR: [
          { orderNo: { contains: q, mode: "insensitive" } },
          { patient: { nameAr: { contains: q, mode: "insensitive" } } },
          { patient: { nameEn: { contains: q, mode: "insensitive" } } },
        ],
      },
      take,
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNo: true, patient: { select: { nameAr: true, nameEn: true } } },
    });
    for (const r of rads) {
      results.push({
        type: "rads",
        label: r.orderNo ?? "",
        sublabel: r.patient.nameAr || r.patient.nameEn || "",
        href: `/radiology/${r.id}`,
      });
    }
  }

  if (canAny(user, "prescriptions", ["read", "manage"])) {
    const rx = await prisma.prescription.findMany({
      where: {
        OR: [
          { prescriptionNo: { contains: q, mode: "insensitive" } },
          { patient: { nameAr: { contains: q, mode: "insensitive" } } },
          { patient: { nameEn: { contains: q, mode: "insensitive" } } },
        ],
      },
      take,
      orderBy: { createdAt: "desc" },
      select: { id: true, prescriptionNo: true, patient: { select: { nameAr: true, nameEn: true } } },
    });
    for (const p of rx) {
      results.push({
        type: "prescriptions",
        label: p.prescriptionNo ?? "",
        sublabel: p.patient.nameAr || p.patient.nameEn || "",
        href: `/pharmacy/prescriptions/${p.id}`,
      });
    }
  }

  return NextResponse.json({ results });
}