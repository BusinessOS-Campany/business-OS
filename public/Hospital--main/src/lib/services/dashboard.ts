import "server-only";
import { prisma } from "@/lib/prisma";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

export async function getDashboardData(branchId?: string | null) {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = startOfMonth();
  const now = new Date();

  const [
    totalPatients,
    todayRegistrations,
    todayAppointments,
    admittedCount,
    dischargedToday,
    beds,
    operatingRooms,
    doctors,
    nurses,
    todayInvoices,
    monthInvoices,
    claimsPending,
    cancelledAppointments,
    emergencyWaiting,
    labOrdersToday,
    radOrdersToday,
    prescriptionsToday,
    todaySchedule,
    recentPatients,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.count({ where: { createdAt: { gte: today } } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: today, lt: tomorrow } } }),
    prisma.admission.count({ where: { status: "ADMITTED" } }),
    prisma.admission.count({ where: { dischargedAt: { gte: today, lt: tomorrow } } }),
    prisma.bed.findMany({ select: { status: true, bedType: true } }),
    prisma.operatingRoom.count({ where: { isActive: true } }),
    prisma.employee.count({
      where: {
        employeeType: "DOCTOR",
        employeeStatus: "ACTIVE",
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.employee.count({
      where: {
        employeeType: "NURSE",
        employeeStatus: "ACTIVE",
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.invoice.findMany({ select: { total: true } }),
    prisma.invoice.findMany({
      where: { issuedAt: { gte: monthStart } },
      select: { total: true, issuedAt: true },
    }),
    prisma.insuranceClaim.count({
      where: { status: { in: ["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "PARTIALLY_APPROVED"] } },
    }),
    prisma.appointment.count({
      where: { status: "CANCELLED", scheduledAt: { gte: today, lt: tomorrow } },
    }),
    prisma.encounter.count({
      where: { encounterType: "EMERGENCY", status: { in: ["WAITING", "IN_PROGRESS"] } },
    }),
    prisma.labOrder.count({ where: { createdAt: { gte: today } } }),
    prisma.radiologyOrder.count({ where: { createdAt: { gte: today } } }),
    prisma.prescription.count({ where: { createdAt: { gte: today } } }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: today, lt: tomorrow }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      include: {
        patient: { select: { nameAr: true, nameEn: true, mrn: true } },
        doctor: { select: { nameAr: true, nameEn: true, specialty: { select: { nameEn: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 8,
    }),
    prisma.patient.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        mrn: true,
        gender: true,
        photo: true,
      },
    }),
  ]);

  const availableBeds = beds.filter((b) => b.status === "AVAILABLE").length;
  const occupiedBeds = beds.filter((b) => b.status === "OCCUPIED").length;
  const cleaningBeds = beds.filter((b) => b.status === "CLEANING").length;
  const maintenanceBeds = beds.filter((b) => b.status === "MAINTENANCE").length;
  const icuBeds = beds.filter((b) => b.bedType === "ICU");
  const icuOccupied = icuBeds.filter((b) => b.status === "OCCUPIED").length;

  const totalRevenue = todayInvoices.reduce((s, i) => s + Number(i.total), 0);
  const monthRevenue = monthInvoices.reduce((s, i) => s + Number(i.total), 0);

  // outstanding computed properly from DB
  const outstandingRows = await prisma.invoice.findMany({
    where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
    select: { total: true, paidAmount: true },
  });
  const outstandingTotal = outstandingRows.reduce(
    (s, i) => s + Math.max(0, Number(i.total) - Number(i.paidAmount)),
    0
  );

  // Revenue trend: last 14 days
  const revenueTrend: { label: string; revenue: number; appointments: number }[] = [];
  const appointmentRows = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: monthStart } },
    select: { scheduledAt: true },
  });
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayInvoices = monthInvoices.filter(
      (inv) => inv.issuedAt >= d && inv.issuedAt < next
    );
    const dayAppointments = appointmentRows.filter(
      (a) => a.scheduledAt >= d && a.scheduledAt < next
    );
    revenueTrend.push({
      label: d.toLocaleDateString("en", { day: "2-digit", month: "short" }),
      revenue: dayInvoices.reduce((s, inv) => s + Number(inv.total), 0),
      appointments: dayAppointments.length,
    });
  }

  const deptPerformance = await prisma.invoiceItem.groupBy({
    by: ["type"],
    _sum: { total: true },
    where: { createdAt: { gte: monthStart } },
  });

  const todayAppointmentsReduced = await prisma.appointment.groupBy({
    by: ["status"],
    _count: { _all: true },
    where: { scheduledAt: { gte: today, lt: tomorrow } },
  });

  return {
    metrics: {
      totalPatients,
      todayRegistrations,
      todayAppointments,
      admittedCount,
      dischargedToday,
      availableBeds,
      occupiedBeds,
      cleaningBeds,
      maintenanceBeds,
      icuTotal: icuBeds.length,
      icuOccupied,
      operatingRooms,
      doctors,
      nurses,
      totalRevenue,
      monthRevenue,
      outstanding: outstandingTotal,
      claimsPending,
      cancelledAppointments,
      emergencyWaiting,
      labOrdersToday,
      radOrdersToday,
      prescriptionsToday,
    },
    revenueTrend,
    deptRevenue: deptPerformance.map((d) => ({
      type: d.type,
      total: Number(d._sum.total ?? 0),
    })),
    todayStatuses: todayAppointmentsReduced,
    todaySchedule,
    recentPatients,
    updatedAt: now,
  };
}