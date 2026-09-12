import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';
import type { CreateUserInput, UpdateUserInput } from './users.schema.js';

export async function listUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null, role: { not: 'PATIENT' } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, username: true, email: true, firstName: true, lastName: true,
      phone: true, role: true, department: true, isActive: true, permissions: true, createdAt: true,
    },
  });
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) throw new NotFoundError('User');
  const { password, ...rest } = user;
  return rest;
}

export async function createUser(input: CreateUserInput) {
  const usernameExists = await prisma.user.findUnique({ where: { username: input.username } });
  if (usernameExists) throw new ConflictError('Username already taken');
  const email = input.email || `user_${input.username}@system.com`;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already registered');
  const hashedPassword = await bcrypt.hash(input.password, 12);
  return prisma.user.create({
    data: {
      username: input.username,
      email,
      password: hashedPassword,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      department: input.department,
      role: input.role,
      permissions: input.permissions ?? [],
    },
    select: {
      id: true, username: true, email: true, firstName: true, lastName: true,
      phone: true, role: true, department: true, isActive: true, permissions: true, createdAt: true,
    },
  });
}

export async function updateUser(id: string, data: UpdateUserInput) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('User');
  if (data.email && data.email !== existing.email) {
    const conflict = await prisma.user.findUnique({ where: { email: data.email } });
    if (conflict) throw new ConflictError('Email already in use');
  }
  const updateData: any = { ...data };
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 12);
  } else {
    delete updateData.password;
  }
  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true, username: true, email: true, firstName: true, lastName: true,
      phone: true, role: true, department: true, isActive: true, permissions: true, createdAt: true,
    },
  });
}

export async function deleteUser(id: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('User');
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function toggleStatus(id: string, isActive: boolean) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('User');
  return prisma.user.update({
    where: { id },
    data: { isActive },
    select: {
      id: true, username: true, email: true, firstName: true, lastName: true,
      phone: true, role: true, department: true, isActive: true, permissions: true, createdAt: true,
    },
  });
}

export async function updatePermissions(id: string, permissions: string[]) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('User');
  return prisma.user.update({
    where: { id },
    data: { permissions },
    select: {
      id: true, username: true, email: true, firstName: true, lastName: true,
      phone: true, role: true, department: true, isActive: true, permissions: true, createdAt: true,
    },
  });
}
