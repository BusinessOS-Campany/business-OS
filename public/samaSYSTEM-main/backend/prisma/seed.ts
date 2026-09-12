import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash('demo123', 12);
  const adminPermissions = ['dashboard', 'patients', 'sessions', 'appointments', 'calendar', 'services', 'coverages', 'invoices', 'website', 'subscribers', 'wallet-transfers', 'advances', 'expenses', 'employees', 'users', 'reports', 'receivables', 'notifications', 'chat'];

  const users = [
    { username: 'demo', email: 'demo@sama.com', firstName: 'Demo', lastName: 'User', role: 'ADMIN' as const, password, permissions: adminPermissions },
    { username: 'admin', email: 'admin@sama.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN' as const, password, permissions: adminPermissions },
    { username: 'samacenter', email: 'samacenter@sama.com', firstName: 'أحمد', lastName: 'علي', role: 'THERAPIST' as const, password, department: 'علاج طبيعي' },
    { username: 'therapist2', email: 'therapist2@sama.com', firstName: 'سارة', lastName: 'محمد', role: 'THERAPIST' as const, password, department: 'علاج طبيعي' },
    { username: 'receptionist', email: 'receptionist@sama.com', firstName: 'نورا', lastName: 'حسن', role: 'RECEPTIONIST' as const, password },
    { username: 'therapist3', email: 'therapist3@sama.com', firstName: 'خالد', lastName: 'عمر', role: 'THERAPIST' as const, password, department: 'علاج طبيعي' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { ...(u.permissions ? { permissions: u.permissions } : {}), isActive: true },
      create: u,
    });
  }

  const employees = [
    { name: 'أحمد علي', department: 'علاج طبيعي', phone: '777111222' },
    { name: 'سارة محمد', department: 'علاج طبيعي', phone: '777333444' },
    { name: 'خالد عمر', department: 'علاج طبيعي', phone: '777555666' },
    { name: 'نورا حسن', department: 'استقبال', phone: '777777888' },
    { name: 'محمود رضا', department: 'تغذية', phone: '777999000' },
  ];

  for (const e of employees) {
    const existing = await prisma.employee.findFirst({ where: { name: e.name } });
    if (existing) {
      await prisma.employee.update({ where: { id: existing.id }, data: e });
    } else {
      await prisma.employee.create({ data: e });
    }
  }

  const services = [
    { name: 'معاينة علاج طبيعي', price: 1000 },
    { name: 'جلسات علاج طبيعي (كبار)', price: 3000 },
    { name: 'جلسات علاج طبيعي (أطفال)', price: 1500 },
    { name: 'استشارات تغذية', price: 2000 },
    { name: 'الحجامة بدون قلاصات', price: 3000 },
    { name: 'الحجامة مع القلاصات', price: 5000 },
    { name: 'المساج الطبي الاسترخائي (جزئي)', price: 5000 },
    { name: 'المساج الطبي الاسترخائي (كلي)', price: 10000 },
    { name: 'قلاصات الحجامة', price: 2000 },
    { name: 'اللاصقات', price: 3000 },
    { name: 'الصقات بالمتر (المتر الواحد)', price: 600 },
    { name: 'حزام الرقبة', price: 2500 },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: { price: s.price },
      create: s,
    });
  }

  const packages = [
    {
      name: 'الأساسية',
      priceUsd: 60,
      priceYer: 24000,
      popular: false,
      features: ['جلسة علاج واحدة', 'تقييم كامل', 'أنماط علاج قياسية', 'خطة تمارين منزلية', 'اختر الباقة'],
    },
    {
      name: 'التعافي',
      priceUsd: 290,
      priceYer: 116000,
      popular: true,
      features: ['5 جلسات علاج', 'برنامج مخصص', 'أنماط علاج متقدمة', 'تتبع التقدم', 'حجز بأولوية', 'اختر الباقة'],
    },
    {
      name: 'التميّز',
      priceUsd: 1200,
      priceYer: 480000,
      popular: false,
      features: ['20 جلسة علاج', 'أخصائي مخصص', 'كل الأنماط بما فيها الموجات الصادمة', 'زيارات منزلية متاحة', 'دعم على مدار الساعة', 'خصومات للعائلة'],
    },
  ];

  for (const p of packages) {
    const existing = await prisma.package.findFirst({ where: { name: p.name, deletedAt: null } });
    if (existing) {
      await prisma.package.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.package.create({ data: p });
    }
  }

  console.log('Seed completed!');
  console.log('  All users password: demo123');
  console.log('  Users: demo, admin, samacenter, therapist2, receptionist, therapist3');
  console.log(`  ${employees.length} employees created`);
  console.log(`  ${services.length} services created`);
  console.log(`  ${packages.length} packages created`);
}
main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
