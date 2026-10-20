import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function getStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const where = { deletedAt: null };

  const [total, daily, weekly, monthly, males, females] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.count({ where: { ...where, createdAt: { gte: startOfDay } } }),
    prisma.patient.count({ where: { ...where, createdAt: { gte: startOfWeek } } }),
    prisma.patient.count({ where: { ...where, createdAt: { gte: startOfMonth } } }),
    prisma.patient.count({ where: { ...where, gender: 'male' } }),
    prisma.patient.count({ where: { ...where, gender: 'female' } }),
  ]);

  return { total, daily, weekly, monthly, males, females };
}

export async function listPatients() {
  return prisma.patient.findMany({
    where: { deletedAt: null },
    orderBy: { serialNumber: 'asc' },
  });
}

export async function getPatient(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) throw new NotFoundError('Patient');
  return patient;
}

export async function getPatientFile(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient || patient.deletedAt) throw new NotFoundError('Patient');

  const age = patient.dateOfBirth
    ? (new Date().getFullYear() - patient.dateOfBirth.getFullYear()).toString()
    : '';
  const d = patient.registrationDate ? new Date(patient.registrationDate) : new Date();

  return {
    fullname: `${patient.firstName} ${patient.lastName || ''}`.trim(),
    gender: patient.gender || '',
    age,
    date: `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`,
    phone: patient.phone || '',
    examType: patient.examType || '',
    serialNumber: patient.serialNumber.toString(),
    price: patient.price?.toString() || '',
  };
}

async function getNextSerialNumber() {
  const max = await prisma.patient.aggregate({
    _max: { serialNumber: true },
    where: { deletedAt: null },
  });
  return (max._max.serialNumber ?? 0) + 1;
}

export async function createPatient(data: {
  examType: string;
  fullName: string;
  manualId?: string;
  age?: number;
  gender: string;
  phone?: string;
  date?: string | null;
  price?: number;
  payment_method?: string;
  wallet_type?: string;
  transaction_number?: string;
  installments?: string;
}) {
  const trimmed = data.fullName.trim();
  if (!trimmed) throw new Error('Patient name is required');
  const [firstName, ...rest] = trimmed.split(' ');
  const lastName = rest.join(' ') || '';
  const serialNumber = await getNextSerialNumber();

  return prisma.patient.create({
    data: {
      serialNumber,
      manualId: data.manualId || null,
      firstName,
      lastName: lastName || null,
      phone: data.phone || null,
      examType: data.examType,
      gender: data.gender,
      price: data.price ?? null,
      paymentMethod: data.payment_method || null,
      walletType: data.wallet_type || null,
      transactionNumber: data.transaction_number || null,
      installments: data.installments || null,
      registrationDate: data.date ? new Date(data.date) : null,
      dateOfBirth: data.age ? new Date(new Date().getFullYear() - data.age, 0, 1) : null,
    },
  });
}

export async function updatePatient(id: string, data: {
  examType?: string;
  fullName?: string;
  manualId?: string;
  age?: number;
  gender: string;
  phone?: string;
  date?: string | null;
  price?: number;
  payment_method?: string;
  wallet_type?: string;
  transaction_number?: string;
  installments?: string;
}) {
  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Patient');

  const updateData: Record<string, unknown> = {};

  if (data.fullName) {
    const trimmed = data.fullName.trim();
    if (trimmed) {
      const [firstName, ...rest] = trimmed.split(' ');
      updateData.firstName = firstName;
      updateData.lastName = rest.join(' ') || null;
    }
  }
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.manualId !== undefined) updateData.manualId = data.manualId;
  if (data.examType !== undefined) updateData.examType = data.examType;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.payment_method !== undefined) updateData.paymentMethod = data.payment_method;
  if (data.wallet_type !== undefined) updateData.walletType = data.wallet_type;
  if (data.transaction_number !== undefined) updateData.transactionNumber = data.transaction_number;
  if (data.installments !== undefined) updateData.installments = data.installments;
  if (data.date !== undefined) {
    updateData.registrationDate = data.date ? new Date(data.date) : null;
  }
  if (data.age !== undefined) {
    updateData.dateOfBirth = data.age ? new Date(new Date().getFullYear() - data.age, 0, 1) : null;
  }

  return prisma.patient.update({ where: { id }, data: updateData });
}

async function renumberPatients() {
  const remaining = await prisma.patient.findMany({
    where: { deletedAt: null },
    orderBy: { serialNumber: 'asc' },
  });
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].serialNumber !== i + 1) {
      await prisma.patient.update({
        where: { id: remaining[i].id },
        data: { serialNumber: i + 1 },
      });
    }
  }
}

export async function deletePatient(id: string) {
  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Patient');

  await prisma.patient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await renumberPatients();
}
