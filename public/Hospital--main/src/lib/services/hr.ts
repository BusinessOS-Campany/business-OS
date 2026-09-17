import type { LeaveStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getAttendance(opts: { date?: string; employeeId?: string; limit?: number } = {}) {
  return prisma.attendance.findMany({
    where: {
      ...(opts.date ? { date: new Date(opts.date) } : {}),
      ...(opts.employeeId ? { employeeId: opts.employeeId } : {}),
    },
    include: {
      employee: { select: { id: true, employeeNo: true, nameAr: true, nameEn: true } },
    },
    orderBy: [{ date: "desc" }, { employee: { nameEn: "asc" } }],
    take: opts.limit ?? 100,
  });
}

export function getShifts() {
  return prisma.shift.findMany({
    orderBy: { nameEn: "asc" },
    take: 100,
  });
}

export function getEmployeeShifts(opts: { date?: string; limit?: number } = {}) {
  return prisma.employeeShift.findMany({
    where: {
      ...(opts.date ? { date: new Date(opts.date) } : {}),
    },
    include: {
      employee: { select: { id: true, employeeNo: true, nameAr: true, nameEn: true } },
      shift: true,
    },
    orderBy: [{ date: "desc" }, { employee: { nameEn: "asc" } }],
    take: opts.limit ?? 100,
  });
}

export function getLeaveRequests(opts: { status?: LeaveStatus; limit?: number } = {}) {
  return prisma.leaveRequest.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
    },
    include: {
      employee: { select: { id: true, employeeNo: true, nameAr: true, nameEn: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });
}

export async function getHrStats(date: Date) {
  const [present, absent, late, onLeave, pendingLeaves] = await Promise.all([
    prisma.attendance.count({ where: { date, status: "PRESENT" } }),
    prisma.attendance.count({ where: { date, status: "ABSENT" } }),
    prisma.attendance.count({ where: { date, status: "LATE" } }),
    prisma.attendance.count({ where: { date, status: "LEAVE" } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
  ]);
  return { present, absent, late, onLeave, pendingLeaves };
}

export function getHrEmployees() {
  return prisma.employee.findMany({
    select: { id: true, employeeNo: true, nameAr: true, nameEn: true },
    orderBy: { nameEn: "asc" },
    take: 200,
  });
}