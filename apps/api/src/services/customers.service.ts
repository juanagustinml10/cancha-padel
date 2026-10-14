import type { Booking, Customer } from '@padel/shared';
import { notFound } from '@/domain/errors';
import { prisma } from '@/infra/prisma';
import { serializeBooking, serializeCustomer } from '@/utils/serialize';

export async function listCustomers(search?: string): Promise<Customer[]> {
  const term = search?.trim();
  const customers = await prisma.customer.findMany({
    where: term
      ? {
          OR: [
            { fullName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term } },
          ],
        }
      : undefined,
    orderBy: { fullName: 'asc' },
  });
  return customers.map(serializeCustomer);
}

export async function getCustomer(id: string): Promise<{ customer: Customer; bookings: Booking[] }> {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw notFound('Cliente no encontrado.', 'CUSTOMER_NOT_FOUND');

  const bookings = await prisma.booking.findMany({
    where: { customerId: id },
    include: { court: true, customer: true },
    orderBy: { startsAt: 'desc' },
  });

  return {
    customer: serializeCustomer(customer),
    bookings: bookings.map(serializeBooking),
  };
}

export interface CustomerUpdateInput {
  fullName?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export async function updateCustomer(id: string, input: CustomerUpdateInput): Promise<Customer> {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw notFound('Cliente no encontrado.', 'CUSTOMER_NOT_FOUND');

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.email !== undefined ? { email: input.email.toLowerCase() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });
  return serializeCustomer(customer);
}
