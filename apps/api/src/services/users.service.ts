import type { Role, StaffUser } from '@padel/shared';
import { notFound } from '@/domain/errors';
import { prisma } from '@/infra/prisma';
import { hashPassword } from '@/utils/password';
import { serializeStaffUser } from '@/utils/serialize';

export interface CreateUserInput {
  fullName: string;
  email: string;
  role: Role;
  password: string;
}

export interface UpdateUserInput {
  fullName?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
}

export async function listUsers(): Promise<StaffUser[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return users.map(serializeStaffUser);
}

export async function createUser(input: CreateUserInput): Promise<StaffUser> {
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      passwordHash,
    },
  });
  return serializeStaffUser(user);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<StaffUser> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound('Usuario no encontrado.', 'USER_NOT_FOUND');

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  // Al deshabilitar un usuario, se cierran sus sesiones activas.
  if (input.isActive === false) {
    await prisma.session.deleteMany({ where: { userId: id } }).catch(() => undefined);
  }

  return serializeStaffUser(user);
}
