import { prisma } from '../../config/database.js';

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const KSA_OFFSET_MS = 3 * 60 * 60 * 1000;

function getKsaDate(now: Date = new Date()) {
  const ksa = new Date(now.getTime() + KSA_OFFSET_MS);
  return {
    year: ksa.getUTCFullYear(),
    month: ksa.getUTCMonth(),
    day: ksa.getUTCDate(),
    dayOfWeek: ksa.getUTCDay(),
    hour: ksa.getUTCHours(),
  };
}

function ksaMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - KSA_OFFSET_MS);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function prevMonth(year: number, month: number) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

function daysToSaturday(dow: number): number {
  return dow === 6 ? 0 : dow + 1;
}

function paidInstallments(installments: string | null): number {
  if (!installments) return 0;
  try {
    const d = JSON.parse(installments);
    const payments = Array.isArray(d) ? d : d?.payments || [];
    return payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  } catch {
    return 0;
  }
}

async function getSubscriptionPaidRevenue(where: any): Promise<number> {
  const sessions = await prisma.session.findMany({
    where,
    select: { installments: true },
  });
  return sessions.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
}

export async function getStats(locale = 'ar', period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
  const now = new Date();
  const ksa = getKsaDate(now);
  const { year: ksaYear, month: ksaMonth, day: ksaDay, dayOfWeek: ksaDow } = ksa;
  const pm = prevMonth(ksaYear, ksaMonth);

  const startOfDay = ksaMidnight(ksaYear, ksaMonth, ksaDay);
  const startOfWeek = ksaMidnight(ksaYear, ksaMonth, ksaDay - daysToSaturday(ksaDow));
  const startOfMonth = ksaMidnight(ksaYear, ksaMonth, 1);
  const startOfLastMonth = ksaMidnight(pm.year, pm.month, 1);
  const startOfTomorrow = ksaMidnight(ksaYear, ksaMonth, ksaDay + 1);
  const startOfYesterday = ksaMidnight(ksaYear, ksaMonth, ksaDay - 1);
  const endOfThisWeek = ksaMidnight(ksaYear, ksaMonth, ksaDay - daysToSaturday(ksaDow) + 7);
  const startOfLastWeek = ksaMidnight(ksaYear, ksaMonth, ksaDay - daysToSaturday(ksaDow) - 7);
  const monthNames = locale === 'ar' ? MONTHS_AR : MONTHS_EN;

  const todayStr = `${ksaYear}-${pad(ksaMonth + 1)}-${pad(ksaDay)}`;
  const yesterdayKsa = getKsaDate(new Date(Date.UTC(ksaYear, ksaMonth, ksaDay - 1)));
  const yesterdayStr = `${yesterdayKsa.year}-${pad(yesterdayKsa.month + 1)}-${pad(yesterdayKsa.day)}`;
  const thisMonthStr = `${ksaYear}-${pad(ksaMonth + 1)}`;
  const lastMonthStr = `${pm.year}-${pad(pm.month + 1)}`;

  const startOfPeriod = period === 'daily' ? startOfDay : period === 'weekly' ? startOfWeek : startOfMonth;
  const endOfPeriod = period === 'daily' ? ksaMidnight(ksaYear, ksaMonth, ksaDay + 1) : period === 'weekly' ? ksaMidnight(ksaYear, ksaMonth, ksaDay - daysToSaturday(ksaDow) + 7) : ksaMidnight(ksaYear, ksaMonth + 1, 1);
  const startOfPrevPeriod = period === 'daily'
    ? ksaMidnight(ksaYear, ksaMonth, ksaDay - 1)
    : period === 'weekly'
      ? ksaMidnight(ksaYear, ksaMonth, ksaDay - daysToSaturday(ksaDow) - 7)
      : startOfLastMonth;
  const endOfPrevPeriod = period === 'monthly' ? startOfPeriod : period === 'weekly' ? ksaMidnight(ksaYear, ksaMonth, ksaDay - daysToSaturday(ksaDow)) : ksaMidnight(ksaYear, ksaMonth, ksaDay);

  const weekStartKsa = getKsaDate(startOfWeek);
  const weekEndKsa = getKsaDate(endOfPeriod);
  const thisPeriodStr = period === 'daily' ? todayStr : period === 'weekly' ? `${weekStartKsa.year}-${pad(weekStartKsa.month+1)}-${pad(weekStartKsa.day)}` : thisMonthStr;
  const thisPeriodEndStr = period === 'daily' ? todayStr : period === 'weekly' ? `${weekEndKsa.year}-${pad(weekEndKsa.month+1)}-${pad(weekEndKsa.day)}` : thisMonthStr;
  const prevWeekStart = period === 'weekly' ? getKsaDate(startOfPrevPeriod) : null;
  const prevWeekEnd = period === 'weekly' ? getKsaDate(new Date(endOfPrevPeriod.getTime() - 86400000)) : null;
  const lastPeriodStr = period === 'daily' ? yesterdayStr : period === 'weekly' ? (prevWeekStart ? `${prevWeekStart.year}-${pad(prevWeekStart.month+1)}-${pad(prevWeekStart.day)}` : '') : lastMonthStr;
  const lastPeriodEndStr = period === 'daily' ? yesterdayStr : period === 'weekly' ? (prevWeekEnd ? `${prevWeekEnd.year}-${pad(prevWeekEnd.month+1)}-${pad(prevWeekEnd.day)}` : '') : lastMonthStr;

  const [
    totalPatients,
    patientsThisPeriod,
    patientsPrevPeriod,
    dailyPatients,
    weeklyPatients,
    patientsMonth,
    totalMales,
    totalFemales,
    todaysAppointments,
    yesterdaysAppointments,
    totalAppointmentsThisPeriod,
    totalAppointmentsPrevPeriod,
    therapists,
    revenueThisPeriod,
    revenuePrevPeriod,
    patientRevenueThisPeriod,
    patientRevenuePrevPeriod,
    sessionsThisPeriod,
    sessionsPrevPeriod,
    sessionTypes,
    recentAppointments,
    appointmentStatuses,
    recentPatients,
    totalExpensesThisPeriod,
    totalExpensesPrevPeriod,
    totalSessions,
    invoicesThisPeriod,
    subscriptionRevenueThisPeriod,
    subscriptionRevenuePrevPeriod,
    dailyRegRevenueThis,
    dailyRegRevenueLast,
    dailyPatRevenueThis,
    dailyPatRevenueLast,
    dailySubSessionsThis,
    dailySubSessionsLast,
    weekRegRevenueThis,
    weekRegRevenueLast,
    weekPatRevenueThis,
    weekPatRevenueLast,
    weekSubSessionsThis,
    weekSubSessionsLast,
  ] = await Promise.all([
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.patient.count({ where: { deletedAt: null, createdAt: { gte: startOfPeriod } } }),
    prisma.patient.count({
      where: { deletedAt: null, createdAt: { gte: startOfPrevPeriod, lt: startOfPeriod } },
    }),
    prisma.patient.count({ where: { deletedAt: null, createdAt: { gte: startOfDay } } }),
    prisma.patient.count({ where: { deletedAt: null, createdAt: { gte: startOfWeek } } }),
    prisma.patient.count({ where: { deletedAt: null, createdAt: { gte: startOfPeriod } } }),
    prisma.patient.count({ where: { deletedAt: null, gender: { in: ['ذكر', 'male'] } } }),
    prisma.patient.count({ where: { deletedAt: null, gender: { in: ['أنثى', 'female'] } } }),
    prisma.appointment.count({ where: { deletedAt: null, date: todayStr } }),
    prisma.appointment.count({ where: { deletedAt: null, date: yesterdayStr } }),
    period === 'monthly'
      ? prisma.appointment.count({ where: { deletedAt: null, date: { startsWith: thisPeriodStr } } })
      : prisma.appointment.count({ where: { deletedAt: null, date: { gte: thisPeriodStr, lte: thisPeriodEndStr } } }),
    period === 'monthly'
      ? prisma.appointment.count({ where: { deletedAt: null, date: { startsWith: lastPeriodStr } } })
      : prisma.appointment.count({ where: { deletedAt: null, date: { gte: lastPeriodStr, lte: lastPeriodEndStr } } }),
    prisma.user.count({ where: { deletedAt: null, role: 'THERAPIST', isActive: true, department: 'علاج طبيعي' } }),
    prisma.session.aggregate({
      where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: startOfPeriod } },
      _sum: { price: true },
    }),
    prisma.session.aggregate({
      where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: startOfPrevPeriod, lt: startOfPeriod } },
      _sum: { price: true },
    }),
    prisma.patient.aggregate({
      where: { deletedAt: null, createdAt: { gte: startOfPeriod } },
      _sum: { price: true },
    }),
    prisma.patient.aggregate({
      where: { deletedAt: null, createdAt: { gte: startOfPrevPeriod, lt: startOfPeriod } },
      _sum: { price: true },
    }),
    prisma.session.count({ where: { deletedAt: null, sessionDate: { gte: startOfPeriod } } }),
    prisma.session.count({
      where: { deletedAt: null, sessionDate: { gte: startOfPrevPeriod, lt: startOfPeriod } },
    }),
    prisma.session.groupBy({
      by: ['sessionType'],
      where: { deletedAt: null, sessionDate: { gte: startOfPeriod } },
      _count: true,
    }),
    prisma.appointment.findMany({
      where: { deletedAt: null, ...(period === 'monthly' ? { date: { startsWith: thisPeriodStr } } : { date: { gte: thisPeriodStr, lte: thisPeriodEndStr } }) },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.patient.findMany({
      where: { deletedAt: null, createdAt: { gte: startOfPeriod } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    period === 'monthly'
      ? prisma.expense.aggregate({ where: { deletedAt: null, date: { startsWith: thisPeriodStr } }, _sum: { amount: true } })
      : prisma.expense.aggregate({ where: { deletedAt: null, date: { gte: thisPeriodStr, lte: thisPeriodEndStr } }, _sum: { amount: true } }),
    period === 'monthly'
      ? prisma.expense.aggregate({ where: { deletedAt: null, date: { startsWith: lastPeriodStr } }, _sum: { amount: true } })
      : prisma.expense.aggregate({ where: { deletedAt: null, date: { gte: lastPeriodStr, lte: lastPeriodEndStr } }, _sum: { amount: true } }),
    prisma.session.count({ where: { deletedAt: null } }),
    prisma.session.count({ where: { deletedAt: null, sessionDate: { gte: startOfPeriod } } }),
    prisma.session.findMany({
      where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: startOfPeriod } },
      select: { installments: true },
    }),
    prisma.session.findMany({
      where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: startOfPrevPeriod, lt: startOfPeriod } },
      select: { installments: true },
    }),
    prisma.session.aggregate({
      where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: startOfDay, lt: startOfTomorrow } },
      _sum: { price: true },
    }),
    prisma.session.aggregate({
      where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: startOfYesterday, lt: startOfDay } },
      _sum: { price: true },
    }),
    prisma.patient.aggregate({
      where: { deletedAt: null, createdAt: { gte: startOfDay, lt: startOfTomorrow } },
      _sum: { price: true },
    }),
    prisma.patient.aggregate({
      where: { deletedAt: null, createdAt: { gte: startOfYesterday, lt: startOfDay } },
      _sum: { price: true },
    }),
    prisma.session.findMany({
      where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: startOfDay, lt: startOfTomorrow } },
      select: { installments: true },
    }),
    prisma.session.findMany({
      where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: startOfYesterday, lt: startOfDay } },
      select: { installments: true },
    }),
    prisma.session.aggregate({
      where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: startOfWeek, lt: endOfThisWeek } },
      _sum: { price: true },
    }),
    prisma.session.aggregate({
      where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: startOfLastWeek, lt: startOfWeek } },
      _sum: { price: true },
    }),
    prisma.patient.aggregate({
      where: { deletedAt: null, createdAt: { gte: startOfWeek, lt: endOfThisWeek } },
      _sum: { price: true },
    }),
    prisma.patient.aggregate({
      where: { deletedAt: null, createdAt: { gte: startOfLastWeek, lt: startOfWeek } },
      _sum: { price: true },
    }),
    prisma.session.findMany({
      where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: startOfWeek, lt: endOfThisWeek } },
      select: { installments: true },
    }),
    prisma.session.findMany({
      where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: startOfLastWeek, lt: startOfWeek } },
      select: { installments: true },
    }),
  ]);

  const subRevThis = subscriptionRevenueThisPeriod.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
  const subRevLast = subscriptionRevenuePrevPeriod.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
  const dailyRevThis = (dailyRegRevenueThis._sum.price ?? 0) + (dailyPatRevenueThis._sum.price ?? 0) + dailySubSessionsThis.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
  const dailyRevLast = (dailyRegRevenueLast._sum.price ?? 0) + (dailyPatRevenueLast._sum.price ?? 0) + dailySubSessionsLast.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
  const dailyIncomeChange = dailyRevLast > 0 ? ((dailyRevThis - dailyRevLast) / dailyRevLast) * 100 : 0;
  const weekRevThis = (weekRegRevenueThis._sum.price ?? 0) + (weekPatRevenueThis._sum.price ?? 0) + weekSubSessionsThis.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
  const weekRevLast = (weekRegRevenueLast._sum.price ?? 0) + (weekPatRevenueLast._sum.price ?? 0) + weekSubSessionsLast.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
  const weeklyIncomeChange = weekRevLast > 0 ? ((weekRevThis - weekRevLast) / weekRevLast) * 100 : 0;
  const revThis = (revenueThisPeriod._sum.price ?? 0) + (patientRevenueThisPeriod._sum.price ?? 0) + subRevThis;
  const revLast = (revenuePrevPeriod._sum.price ?? 0) + (patientRevenuePrevPeriod._sum.price ?? 0) + subRevLast;
  const revChange = revLast > 0 ? ((revThis - revLast) / revLast) * 100 : 0;
  const patientGrowth = patientsPrevPeriod > 0
    ? ((patientsThisPeriod - patientsPrevPeriod) / patientsPrevPeriod) * 100
    : 0;
  const apptGrowth = totalAppointmentsPrevPeriod > 0
    ? ((totalAppointmentsThisPeriod - totalAppointmentsPrevPeriod) / totalAppointmentsPrevPeriod) * 100
    : 0;
  const sessionsGrowth = sessionsPrevPeriod > 0
    ? ((sessionsThisPeriod - sessionsPrevPeriod) / sessionsPrevPeriod) * 100
    : 0;
  const expenseLastAmt = totalExpensesPrevPeriod._sum.amount ?? 0;
  const expenseThisAmt = totalExpensesThisPeriod._sum.amount ?? 0;
  const expenseGrowth = expenseLastAmt > 0
    ? ((expenseThisAmt - expenseLastAmt) / expenseLastAmt) * 100
    : 0;

  const formatTrend = (val: number) => val >= 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`;

  const monthlyRevArr = await getMonthlyRevenue(ksaYear);
  const monthlyPatArr = await getMonthlyPatients(ksaYear);

  const periodChart = period === 'monthly'
    ? monthlyRevArr.map((r, i) => ({ label: monthNames[i], revenue: r }))
    : await getPeriodChart(period, locale, ksaYear, ksaMonth, ksaDay, ksaDow);

  const recent = recentAppointments.map(a => ({
    id: a.id,
    patient: a.patient,
    phone: a.phone,
    therapist: a.therapist,
    date: a.date,
    status: a.status,
    statusKey: a.status === 'paid' ? 'dashboard.paid' : a.status === 'cancelled' ? 'dashboard.cancelled' : 'dashboard.pending',
  }));

  const recentPats = recentPatients.map(p => ({
    id: p.id,
    name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || '—',
    phone: p.phone || '—',
    gender: p.gender || '—',
    registrationDate: p.registrationDate,
    createdAt: p.createdAt,
  }));

  const sessionTypeChart = sessionTypes.map((s, i) => ({
    name: s.sessionType || 'other',
    value: s._count,
    color: ['#3e5679', '#2e7d32', '#7c4dff', '#e65100', '#00838f', '#558b2f', '#c62828', '#6a1b9a'][i % 8],
  }));

  const apptStatusDistribution = appointmentStatuses.map((s, i) => ({
    name: s.status || 'unknown',
    value: s._count,
    color: ['#3e5679', '#2e7d32', '#7c4dff', '#e65100'][i % 4],
  }));

  const expensesPeriod = totalExpensesThisPeriod._sum.amount ?? 0;
  const netProfit = revThis - expensesPeriod;

  const apptDailyGrowth = yesterdaysAppointments > 0
    ? ((todaysAppointments - yesterdaysAppointments) / yesterdaysAppointments) * 100
    : todaysAppointments > 0 ? 100 : 0;

  return {
    mainCards: {
      totalPatients: { value: totalPatients, trend: formatTrend(patientGrowth), up: patientGrowth >= 0, trendLabel: 'dashboard.vsLastMonth' },
      dailyIncome: { value: dailyRevThis, trend: formatTrend(dailyIncomeChange), up: dailyIncomeChange >= 0, trendLabel: 'dashboard.vsYesterday' },
      weeklyIncome: { value: weekRevThis, trend: formatTrend(weeklyIncomeChange), up: weeklyIncomeChange >= 0, trendLabel: 'dashboard.vsLastWeek' },
      monthlyRevenue: { value: revThis, trend: formatTrend(revChange), up: revChange >= 0, trendLabel: 'dashboard.vsLastMonth' },
    },
    patientTileStats: {
      daily: dailyPatients,
      weekly: weeklyPatients,
      monthly: patientsMonth,
      males: totalMales,
      females: totalFemales,
    },
    revenueOverview: {
      revenue: revThis,
      expenses: expensesPeriod,
      netProfit,
      sessions: sessionsThisPeriod,
      patients: patientsThisPeriod,
      patientRevenue: patientRevenueThisPeriod._sum.price ?? 0,
      sessionRevenue: revenueThisPeriod._sum.price ?? 0,
      subscriptionRevenue: subRevThis,
      invoices: invoicesThisPeriod,
    },
    monthlyRevenue: monthlyRevArr.map((r, i) => ({ month: monthNames[i], revenue: r })),
    monthlyPatients: monthlyPatArr.map((c, i) => ({ month: monthNames[i], count: c })),
    periodChart,
    sessionTypes: sessionTypeChart,
    appointmentStatuses: apptStatusDistribution,
    recentAppointments: recent,
    recentPatients: recentPats,
    totals: {
      totalPatients,
      totalSessions,
      totalAppointments: totalAppointmentsThisPeriod,
      totalTherapists: therapists,
    },
    growthRates: {
      patients: formatTrend(patientGrowth),
      appointments: formatTrend(apptGrowth),
      sessions: formatTrend(sessionsGrowth),
      revenue: formatTrend(revChange),
      expenses: formatTrend(expenseGrowth),
    },
  };
}

export async function getDailyReportData(dateStr?: string) {
  const ksa = dateStr
    ? getKsaDate(ksaMidnight(Number(dateStr.slice(0, 4)), Number(dateStr.slice(5, 7)) - 1, Number(dateStr.slice(8, 10))))
    : getKsaDate();
  const { year: ksaYear, month: ksaMonth, day: ksaDay, dayOfWeek: ksaDow } = ksa;

  const startOfDay = ksaMidnight(ksaYear, ksaMonth, ksaDay);
  const endOfDay = ksaMidnight(ksaYear, ksaMonth, ksaDay + 1);
  const todayStr = `${ksaYear}-${pad(ksaMonth + 1)}-${pad(ksaDay)}`;

  const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const dayName = days[ksaDow];
  const dateDisplay = `${dayName} ${pad(ksaDay)}/${pad(ksaMonth + 1)}/${ksaYear}م`;

  const [sessions, patients, subscriptions, expenses, advances, invoices, coverages] = await Promise.all([
    prisma.session.findMany({
      where: { deletedAt: null, status: 'complete', subscriptionPeriod: null, prepaid: { not: true }, OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: startOfDay, lt: endOfDay } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.patient.findMany({
      where: { deletedAt: null, createdAt: { gte: startOfDay, lt: endOfDay } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.session.findMany({
      where: { deletedAt: null, OR: [{ subscriptionPeriod: { not: null } }, { subscriptionAmount: { gt: 0 } }, { prepaid: true }], sessionDate: { gte: startOfDay, lt: endOfDay } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.expense.findMany({
      where: { deletedAt: null, date: { startsWith: todayStr } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.salaryAdvance.findMany({
      where: { deletedAt: null, date: { startsWith: todayStr } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null, date: { startsWith: todayStr } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.coverage.findMany({
      where: { deletedAt: null, date: { startsWith: todayStr } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const calcAge = (dob: Date | null) => {
    if (!dob) return '';
    const dobKsa = getKsaDate(dob);
    let age = ksaYear - dobKsa.year;
    if (ksaMonth < dobKsa.month || (ksaMonth === dobKsa.month && ksaDay < dobKsa.day)) age--;
    return age.toString();
  };

  const mappedSessions = sessions.map(s => ({
    id: s.id.slice(0, 8),
    fullname: s.fullname,
    session_type: s.sessionType,
    price: s.price ?? 0,
    payment_method: 'جلسة عادية',
    note: s.notes || '',
  }));

  const mappedSubscriptions = subscriptions.map(s => ({
    fullname: s.fullname,
    session_type: s.sessionType,
    subscription_amount: s.prepaid ? (s.price ?? 0) : paidInstallments(s.installments),
    subscription_period: s.prepaid ? 'مدفوع مسبقاً' : (s.subscriptionPeriod || ''),
    payment_method: s.prepaid ? 'دفع مسبق' : (s.subscriptionPeriod && s.subscriptionPeriod !== 'غير محدد') ? `اشتراك-${s.subscriptionPeriod}` : `اشتراك-${s.subscriptionDay ?? ''}`,
  }));

  const mappedPatients = patients.map(p => ({
    fullname: `${p.firstName || ''} ${p.lastName || ''}`.trim() || '—',
    exam_type: p.examType || '—',
    age: calcAge(p.dateOfBirth),
    sex: p.gender || '—',
    phone: p.phone || '—',
    price: p.price ?? 0,
  }));

  const mappedExpenses = expenses.map(e => ({
    category: e.category,
    amount: e.amount,
    employee: e.employee || '',
    notes: e.notes || '',
  }));

  const mappedAdvances = advances.map(a => ({
    employee_name: a.employee,
    amount: a.amount,
    note: a.notes || '',
  }));

  const mappedInvoices = invoices.map(i => ({
    type: i.type === 'water' ? 'water' : 'electricity',
    amount: i.amount,
    notes: i.notes || '',
  }));

  const mappedCoverages = coverages.map(c => ({
    employee_name: c.name,
    session_type: c.sessionType === 'hijama' ? 'حجامة - تغطية' : 'تغطية',
    amount: c.price,
    therapistShare: c.therapistShare ?? 0,
    date: c.date,
  }));

  return { dateDisplay, sessions: mappedSessions, patients: mappedPatients, subscriptions: mappedSubscriptions, expenses: mappedExpenses, advances: mappedAdvances, invoices: mappedInvoices, coverages: mappedCoverages };
}

export async function getDailySummary(dateStr?: string) {
  const { dateDisplay, sessions, patients, subscriptions, expenses, advances, invoices, coverages } = await getDailyReportData(dateStr);
  const sumSessions = sessions.reduce((s, x) => s + Number(x.price || 0), 0);
  const sumPatients = patients.reduce((s, x) => s + Number(x.price || 0), 0);
  const sumSubscriptions = subscriptions.reduce((s, x) => s + Number(x.subscription_amount || 0), 0);
  const sumExpenses = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const sumHijamaCoverages = coverages.reduce((s, x) => s + (x.session_type === 'حجامة - تغطية' ? Number(x.amount || 0) : 0), 0);
  const sumNormalCoverages = coverages.reduce((s, x) => s + (x.session_type !== 'حجامة - تغطية' ? Number(x.amount || 0) : 0), 0);
  const sumTherapistShares = coverages.reduce((s, x) => s + Number(x.therapistShare || 0), 0);
  const sumAdvances = advances.reduce((s, x) => s + Number(x.amount || 0), 0);
  const sumInvoices = invoices.reduce((s, x) => s + Number(x.amount || 0), 0);
  const incomeTotal = sumSessions + sumPatients + sumSubscriptions + sumHijamaCoverages;
  const netTotal = incomeTotal - (sumExpenses + sumNormalCoverages + sumTherapistShares + sumAdvances + sumInvoices);
  return { dateDisplay, incomeTotal, sumExpenses, sumAdvances, sumInvoices, netTotal };
}

export async function getWeeklySummary(weekStartStr?: string) {
  let anchor: Date;
  if (weekStartStr) {
    const y = Number(weekStartStr.slice(0, 4));
    const m = Number(weekStartStr.slice(5, 7)) - 1;
    const d = Number(weekStartStr.slice(8, 10));
    const ksa = getKsaDate(ksaMidnight(y, m, d));
    anchor = ksaMidnight(ksa.year, ksa.month, ksa.day - daysToSaturday(ksa.dayOfWeek));
  } else {
    const ksa = getKsaDate();
    anchor = ksaMidnight(ksa.year, ksa.month, ksa.day - daysToSaturday(ksa.dayOfWeek));
  }

  const start = anchor;
  const end = new Date(start.getTime() + 7 * 86400000);

  const startKsa = getKsaDate(start);
  const endKsa = getKsaDate(new Date(end.getTime() - 1));
  const startStr = `${startKsa.year}-${pad(startKsa.month + 1)}-${pad(startKsa.day)}`;
  const endStr = `${endKsa.year}-${pad(endKsa.month + 1)}-${pad(endKsa.day)}`;

  const [sessionRev, patientRev, subscriptionRev, expenseSum, advanceSum, invoiceSum] = await Promise.all([
    prisma.session.aggregate({
      where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: start, lt: end } },
      _sum: { price: true },
    }),
    prisma.patient.aggregate({
      where: { deletedAt: null, createdAt: { gte: start, lt: end } },
      _sum: { price: true },
    }),
    prisma.session.findMany({
      where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: start, lt: end } },
      select: { installments: true },
    }),
    prisma.expense.aggregate({
      where: { deletedAt: null, date: { gte: startStr, lte: endStr } },
      _sum: { amount: true },
    }),
    prisma.salaryAdvance.aggregate({
      where: { deletedAt: null, date: { gte: startStr, lte: endStr } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { deletedAt: null, date: { gte: startStr, lte: endStr } },
      _sum: { amount: true },
    }),
  ]);

  const incomeTotal = (sessionRev._sum.price ?? 0) + (patientRev._sum.price ?? 0) + subscriptionRev.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
  const sumExpenses = expenseSum._sum.amount ?? 0;
  const sumAdvances = advanceSum._sum.amount ?? 0;
  const sumInvoices = invoiceSum._sum.amount ?? 0;
  const netTotal = incomeTotal - (sumExpenses + sumAdvances + sumInvoices);

  return { incomeTotal, sumExpenses, sumAdvances, sumInvoices, netTotal };
}

export async function getMonthlySummary(month?: number, year?: number) {
  const now = new Date();
  const ksa = getKsaDate(now);
  const m = month !== undefined ? month : ksa.month;
  const y = year !== undefined ? year : ksa.year;

  const start = ksaMidnight(y, m, 1);
  const end = ksaMidnight(y, m + 1, 1);
  const monthStr = `${y}-${pad(m + 1)}`;

  const [sessionRev, patientRev, subscriptionRev, expenseSum, advanceSum, invoiceSum] = await Promise.all([
    prisma.session.aggregate({
      where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: start, lt: end } },
      _sum: { price: true },
    }),
    prisma.patient.aggregate({
      where: { deletedAt: null, createdAt: { gte: start, lt: end } },
      _sum: { price: true },
    }),
    prisma.session.findMany({
      where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: start, lt: end } },
      select: { installments: true },
    }),
    prisma.expense.aggregate({
      where: { deletedAt: null, date: { startsWith: monthStr } },
      _sum: { amount: true },
    }),
    prisma.salaryAdvance.aggregate({
      where: { deletedAt: null, date: { startsWith: monthStr } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { deletedAt: null, date: { startsWith: monthStr } },
      _sum: { amount: true },
    }),
  ]);

  const incomeTotal = (sessionRev._sum.price ?? 0) + (patientRev._sum.price ?? 0) + subscriptionRev.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
  const sumExpenses = expenseSum._sum.amount ?? 0;
  const sumAdvances = advanceSum._sum.amount ?? 0;
  const sumInvoices = invoiceSum._sum.amount ?? 0;
  const netTotal = incomeTotal - (sumExpenses + sumAdvances + sumInvoices);

  return { incomeTotal, sumExpenses, sumAdvances, sumInvoices, netTotal };
}

export async function getReceivablesSummary() {
  const [sumSalaries, sumCoverages, sumAdvances] = await Promise.all([
    prisma.employee.aggregate({
      where: { deletedAt: null, isActive: true },
      _sum: { salary: true },
    }),
    prisma.coverage.aggregate({
      where: { deletedAt: null },
      _sum: { price: true },
    }),
    prisma.salaryAdvance.aggregate({
      where: { deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  return {
    sumSalaries: sumSalaries._sum.salary ?? 0,
    sumCoverages: sumCoverages._sum.price ?? 0,
    sumAdvances: sumAdvances._sum.amount ?? 0,
  };
}

export async function getReceivablesTable(month?: string) {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { name: 'asc' },
  });
  const coverageWhere: any = { deletedAt: null };
  const advanceWhere: any = { deletedAt: null };
  if (month) {
    coverageWhere.date = { startsWith: month };
    advanceWhere.date = { startsWith: month };
  }

  const [coverages, advances] = await Promise.all([
    prisma.coverage.findMany({ where: coverageWhere }),
    prisma.salaryAdvance.findMany({ where: advanceWhere }),
  ]);

  const coverageByEmployee: Record<string, number> = {};
  for (const c of coverages) coverageByEmployee[c.name] = (coverageByEmployee[c.name] || 0) + (c.price || 0);

  const advanceByEmployee: Record<string, number> = {};
  for (const a of advances) advanceByEmployee[a.employee] = (advanceByEmployee[a.employee] || 0) + (a.amount || 0);

  return employees.map(emp => {
    const salary = emp.salary ?? 0;
    const coverages = coverageByEmployee[emp.name] || 0;
    const advances = advanceByEmployee[emp.name] || 0;
    return {
      id: emp.id,
      name: emp.name,
      department: emp.department,
      salary,
      coverages,
      advances,
      net: salary + coverages - advances,
    };
  });
}

export async function getMonthlyReportData(month?: number, year?: number) {
  const now = new Date();
  const ksa = getKsaDate(now);
  const m = month !== undefined ? month : ksa.month;
  const y = year !== undefined ? year : ksa.year;

  const monthName = MONTHS_AR[m];

  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  type WeekRow = { weekNumber: number; startDate: string; endDate: string; totalIncome: number; totalExpense: number; net: number };
  const weeklyData: WeekRow[] = [];

  const weekRanges = [
    [1, 7], [8, 14], [15, 21], [22, 28], [29, daysInMonth],
  ];

  for (let wi = 0; wi < weekRanges.length; wi++) {
    const [start, rawEnd] = weekRanges[wi];
    if (start > daysInMonth) break;
    const actualEnd = Math.min(rawEnd, daysInMonth);
    const weekNum = wi + 1;

    const startDate = ksaMidnight(y, m, start);
    const endDate = ksaMidnight(y, m, actualEnd + 1);
    const startStr = `${start} ${monthName}`;
    const endStr = `${actualEnd} ${monthName}`;

    const [sessionRev, patientRev, subscriptionRev, expenseSum, advanceSum, invoiceSum] = await Promise.all([
      prisma.session.aggregate({
        where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: startDate, lt: endDate } },
        _sum: { price: true },
      }),
      prisma.patient.aggregate({
        where: { deletedAt: null, createdAt: { gte: startDate, lt: endDate } },
        _sum: { price: true },
      }),
      prisma.session.findMany({
        where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: startDate, lt: endDate } },
        select: { installments: true },
      }),
      prisma.expense.aggregate({
        where: {
          deletedAt: null,
          date: {
            gte: `${y}-${pad(m + 1)}-${pad(start)}`,
            lte: `${y}-${pad(m + 1)}-${pad(actualEnd)}`,
          },
        },
        _sum: { amount: true },
      }),
      prisma.salaryAdvance.aggregate({
        where: {
          deletedAt: null,
          date: {
            gte: `${y}-${pad(m + 1)}-${pad(start)}`,
            lte: `${y}-${pad(m + 1)}-${pad(actualEnd)}`,
          },
        },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          deletedAt: null,
          date: {
            gte: `${y}-${pad(m + 1)}-${pad(start)}`,
            lte: `${y}-${pad(m + 1)}-${pad(actualEnd)}`,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = (sessionRev._sum.price ?? 0) + (patientRev._sum.price ?? 0) + subscriptionRev.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
    const totalExpense = (expenseSum._sum.amount ?? 0) + (advanceSum._sum.amount ?? 0) + (invoiceSum._sum.amount ?? 0);
    const net = totalIncome - totalExpense;

    weeklyData.push({ weekNumber: weekNum, startDate: startStr, endDate: endStr, totalIncome, totalExpense, net });
  }

  return { monthName, year: y, weeklyData };
}

export async function getWeeklyReportData(weekStartStr?: string) {
  let saturdayMidnight: Date;
  if (weekStartStr) {
    const y = Number(weekStartStr.slice(0, 4));
    const m = Number(weekStartStr.slice(5, 7)) - 1;
    const d = Number(weekStartStr.slice(8, 10));
    const ksa = getKsaDate(ksaMidnight(y, m, d));
    saturdayMidnight = ksaMidnight(ksa.year, ksa.month, ksa.day - daysToSaturday(ksa.dayOfWeek));
  } else {
    const ksa = getKsaDate();
    saturdayMidnight = ksaMidnight(ksa.year, ksa.month, ksa.day - daysToSaturday(ksa.dayOfWeek));
  }

  const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

  const weekData: { day: string; date: string; income: number; expense: number }[] = [];

  for (let d = 0; d < 7; d++) {
    const dayStart = new Date(saturdayMidnight.getTime() + d * 86400000);
    const dayEnd = new Date(saturdayMidnight.getTime() + (d + 1) * 86400000);

    const dayKsa = getKsaDate(dayStart);
    const arabicDay = dayNames[dayKsa.dayOfWeek];
    const dateStr = `${dayKsa.day} ${MONTHS_AR[dayKsa.month]} ${dayKsa.year}`;
    const dateStrExpense = `${dayKsa.year}-${pad(dayKsa.month + 1)}-${pad(dayKsa.day)}`;

    const [sessionRev, patientRev, subscriptionRev, expenseSum, advanceSum, invoiceSum] = await Promise.all([
      prisma.session.aggregate({
        where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: dayStart, lt: dayEnd } },
        _sum: { price: true },
      }),
      prisma.patient.aggregate({
        where: { deletedAt: null, createdAt: { gte: dayStart, lt: dayEnd } },
        _sum: { price: true },
      }),
      prisma.session.findMany({
        where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: dayStart, lt: dayEnd } },
        select: { installments: true },
      }),
      prisma.expense.aggregate({
        where: { deletedAt: null, date: dateStrExpense },
        _sum: { amount: true },
      }),
      prisma.salaryAdvance.aggregate({
        where: { deletedAt: null, date: dateStrExpense },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: { deletedAt: null, date: dateStrExpense },
        _sum: { amount: true },
      }),
    ]);

    const income = (sessionRev._sum.price ?? 0) + (patientRev._sum.price ?? 0) + subscriptionRev.reduce((sum, s) => sum + paidInstallments(s.installments), 0);
    const expense = (expenseSum._sum.amount ?? 0) + (advanceSum._sum.amount ?? 0) + (invoiceSum._sum.amount ?? 0);

    weekData.push({ day: arabicDay, date: dateStr, income, expense });
  }

  const satKsa = getKsaDate(saturdayMidnight);
  const friMidnight = new Date(saturdayMidnight.getTime() + 6 * 86400000);
  const friKsa = getKsaDate(friMidnight);

  const weekStartLabel = `${satKsa.day} ${MONTHS_AR[satKsa.month]} ${satKsa.year}`;
  const weekEndStr = `${friKsa.day} ${MONTHS_AR[friKsa.month]} ${friKsa.year}`;
  const weekLabel = `من تاريخ ${weekStartLabel} - إلى ${weekEndStr}`;

  return { weekData, weekLabel };
}

async function getPeriodChart(period: 'daily' | 'weekly', locale: string, ksaYear: number, ksaMonth: number, ksaDay: number, ksaDow: number) {
  const isDaily = period === 'daily';
  const start = isDaily
    ? ksaMidnight(ksaYear, ksaMonth, 1)
    : ksaMidnight(ksaYear, ksaMonth, ksaDay - daysToSaturday(ksaDow));
  const end = isDaily
    ? ksaMidnight(ksaYear, ksaMonth + 1, 1)
    : ksaMidnight(ksaYear, ksaMonth, ksaDay - daysToSaturday(ksaDow) + 7);

  const [sessions, patients, subs] = await Promise.all([
    prisma.session.findMany({
      where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: start, lt: end } },
      select: { sessionDate: true, price: true },
    }),
    prisma.patient.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lt: end } },
      select: { createdAt: true, price: true },
    }),
    prisma.session.findMany({
      where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: start, lt: end } },
      select: { sessionDate: true, installments: true },
    }),
  ]);

  if (isDaily) {
    const daysInMonth = new Date(Date.UTC(ksaYear, ksaMonth + 1, 0)).getUTCDate();
    const dayBuckets: Record<number, number> = {};
    for (const s of sessions) { if (s.sessionDate) { const d = getKsaDate(s.sessionDate).day; dayBuckets[d] = (dayBuckets[d] || 0) + (s.price ?? 0); } }
    for (const p of patients) { if (p.createdAt) { const d = getKsaDate(p.createdAt).day; dayBuckets[d] = (dayBuckets[d] || 0) + (p.price ?? 0); } }
    for (const s of subs) { if (s.sessionDate) { const d = getKsaDate(s.sessionDate).day; dayBuckets[d] = (dayBuckets[d] || 0) + paidInstallments(s.installments); } }
    return Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1), revenue: dayBuckets[i + 1] || 0 }));
  }

  const weekBuckets: Record<number, number> = {};
  for (const s of sessions) { if (s.sessionDate) weekBuckets[getKsaDate(s.sessionDate).dayOfWeek] = (weekBuckets[getKsaDate(s.sessionDate).dayOfWeek] || 0) + (s.price ?? 0); }
  for (const p of patients) { if (p.createdAt) weekBuckets[getKsaDate(p.createdAt).dayOfWeek] = (weekBuckets[getKsaDate(p.createdAt).dayOfWeek] || 0) + (p.price ?? 0); }
  for (const s of subs) { if (s.sessionDate) weekBuckets[getKsaDate(s.sessionDate).dayOfWeek] = (weekBuckets[getKsaDate(s.sessionDate).dayOfWeek] || 0) + paidInstallments(s.installments); }

  const order = [6, 0, 1, 2, 3, 4, 5];
  const dayNames = locale === 'ar'
    ? ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
    : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  return order.map(dow => ({ label: dayNames[dow], revenue: weekBuckets[dow] || 0 }));
}

const FINANCIAL_DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export async function getFinancialSummary(opts: { from?: string; to?: string } = {}) {
  const now = getKsaDate();
  const todayStr = `${now.year}-${pad(now.month + 1)}-${pad(now.day)}`;
  const fromStr = opts.from || `${now.year}-${pad(now.month + 1)}-01`;
  const toStr = opts.to && opts.to >= fromStr ? opts.to : todayStr;

  const startDate = ksaMidnight(Number(fromStr.slice(0, 4)), Number(fromStr.slice(5, 7)) - 1, Number(fromStr.slice(8, 10)));
  const endDate = ksaMidnight(Number(toStr.slice(0, 4)), Number(toStr.slice(5, 7)) - 1, Number(toStr.slice(8, 10)) + 1);

  const [regularSessions, patientRows, subRows, coverages, expenses, advances, invoices, employees] = await Promise.all([
    prisma.session.findMany({
      where: { deletedAt: null, status: 'complete', subscriptionPeriod: null, prepaid: { not: true }, OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: startDate, lt: endDate } },
      select: { sessionDate: true, price: true },
    }),
    prisma.patient.findMany({
      where: { deletedAt: null, createdAt: { gte: startDate, lt: endDate } },
      select: { createdAt: true, price: true },
    }),
    prisma.session.findMany({
      where: { deletedAt: null, OR: [{ subscriptionPeriod: { not: null } }, { subscriptionAmount: { gt: 0 } }, { prepaid: true }], sessionDate: { gte: startDate, lt: endDate } },
      select: { sessionDate: true, installments: true, price: true, prepaid: true },
    }),
    prisma.coverage.findMany({
      where: { deletedAt: null, date: { gte: fromStr, lte: `${toStr}T23:59` } },
    }),
    prisma.expense.findMany({
      where: { deletedAt: null, date: { gte: fromStr, lte: toStr } },
    }),
    prisma.salaryAdvance.findMany({
      where: { deletedAt: null, date: { gte: fromStr, lte: toStr } },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null, date: { gte: fromStr, lte: toStr } },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, isActive: true },
    }),
  ]);

  const dayKey = (d: Date) => {
    const k = getKsaDate(d);
    return `${k.year}-${pad(k.month + 1)}-${pad(k.day)}`;
  };

  const incomeMap: Record<string, number> = {};
  const advanceMap: Record<string, number> = {};
  const expenseMap: Record<string, number> = {};
  const notesMap: Record<string, string[]> = {};

  const add = (map: Record<string, number>, k: string, v: number | null | undefined) => {
    const val = Number(v) || 0;
    if (!val) return;
    map[k] = (map[k] || 0) + val;
  };
  const note = (k: string, txt: string) => {
    if (!txt) return;
    if (!notesMap[k]) notesMap[k] = [];
    notesMap[k].push(txt);
  };

  for (const s of regularSessions) { if (s.sessionDate) add(incomeMap, dayKey(s.sessionDate), s.price); }
  for (const p of patientRows) { if (p.createdAt) add(incomeMap, dayKey(p.createdAt), p.price); }
  for (const s of subRows) {
    if (!s.sessionDate) continue;
    add(incomeMap, dayKey(s.sessionDate), s.prepaid ? s.price : paidInstallments(s.installments));
  }
  for (const c of coverages) {
    const k = c.date.slice(0, 10);
    if (c.sessionType === 'hijama') {
      add(incomeMap, k, c.price);
    } else {
      add(expenseMap, k, c.price);
      note(k, `تغطية ${c.name || ''}: ${c.price || 0}`);
    }
    if (c.therapistShare) {
      add(expenseMap, k, c.therapistShare);
      note(k, `نسبة معالج (${c.name || ''}): ${c.therapistShare}`);
    }
  }
  for (const e of expenses) {
    add(expenseMap, e.date, e.amount);
    note(e.date, `${e.category || 'مصروف'}: ${e.amount || 0}${e.notes ? ` (${e.notes})` : ''}`);
  }
  for (const a of advances) {
    add(advanceMap, a.date, a.amount);
    note(a.date, `سلفة ${a.employee || ''}: ${a.amount || 0}${a.notes ? ` (${a.notes})` : ''}`);
  }
  for (const inv of invoices) {
    add(expenseMap, inv.date, inv.amount);
    note(inv.date, `${inv.type === 'water' ? 'فاتورة ماء' : 'فاتورة كهرباء'}: ${inv.amount || 0}${inv.notes ? ` (${inv.notes})` : ''}`);
  }

  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  const days: any[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const key = dayKey(d);
    const ksa = getKsaDate(d);
    const income = incomeMap[key] || 0;
    const advancesAmt = advanceMap[key] || 0;
    const expensesAmt = expenseMap[key] || 0;
    days.push({
      date: key,
      dayNumber: ksa.day,
      dayName: FINANCIAL_DAY_NAMES[ksa.dayOfWeek],
      income,
      advances: advancesAmt,
      expenses: expensesAmt,
      net: income - advancesAmt - expensesAmt,
      notes: (notesMap[key] || []).join('، ') || '—',
    });
  }

  const weeks: any[] = [];
  let current: any = null;
  for (const day of days) {
    const d = ksaMidnight(Number(day.date.slice(0, 4)), Number(day.date.slice(5, 7)) - 1, Number(day.date.slice(8, 10)));
    const dow = getKsaDate(d).dayOfWeek;
    if (dow === 6 || !current) {
      if (current) weeks.push(current);
      current = {
        weekNumber: weeks.length + 1,
        startDate: day.date,
        endDate: day.date,
        days: [],
        totals: { income: 0, advances: 0, expenses: 0, net: 0 },
      };
    }
    current.days.push(day);
    current.endDate = day.date;
    current.totals.income += day.income;
    current.totals.advances += day.advances;
    current.totals.expenses += day.expenses;
    current.totals.net += day.net;
  }
  if (current) weeks.push(current);

  const totals = days.reduce(
    (acc, d) => ({
      income: acc.income + d.income,
      advances: acc.advances + d.advances,
      expenses: acc.expenses + d.expenses,
      net: acc.net + d.net,
    }),
    { income: 0, advances: 0, expenses: 0, net: 0 },
  );

  const salaries = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
  const obligations = 0;
  const debtPayment = 0;
  const financialStatus = totals.net - salaries - obligations - debtPayment;

  return {
    from: fromStr,
    to: toStr,
    days,
    weeks,
    totals,
    salaries,
    obligations,
    debtPayment,
    financialStatus,
  };
}

async function getMonthlyRevenue(year: number) {
  const results = [];
  for (let m = 0; m < 12; m++) {
    const start = ksaMidnight(year, m, 1);
    const end = ksaMidnight(year, m + 1, 1);
    const [sessionRev, patientRev, subscriptionRev] = await Promise.all([
      prisma.session.aggregate({
        where: { deletedAt: null, status: 'complete', OR: [{ subscriptionAmount: null }, { subscriptionAmount: 0 }], sessionDate: { gte: start, lt: end } },
        _sum: { price: true },
      }),
      prisma.patient.aggregate({
        where: { deletedAt: null, createdAt: { gte: start, lt: end } },
        _sum: { price: true },
      }),
      prisma.session.findMany({
        where: { deletedAt: null, subscriptionAmount: { gt: 0 }, sessionDate: { gte: start, lt: end } },
        select: { installments: true },
      }),
    ]);
    results.push((sessionRev._sum.price ?? 0) + (patientRev._sum.price ?? 0) + subscriptionRev.reduce((sum, s) => sum + paidInstallments(s.installments), 0));
  }
  return results;
}

async function getMonthlyPatients(year: number) {
  const results = [];
  for (let m = 0; m < 12; m++) {
    const start = ksaMidnight(year, m, 1);
    const end = ksaMidnight(year, m + 1, 1);
    const count = await prisma.patient.count({
      where: { deletedAt: null, createdAt: { gte: start, lt: end } },
    });
    results.push(count);
  }
  return results;
}
