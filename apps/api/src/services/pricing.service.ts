import type { PricingDisplayRow, PricingRule } from '@padel/shared';
import { notFound } from '@/domain/errors';
import { minutesFromTime } from '@/domain/time';
import { prisma } from '@/infra/prisma';
import { serializePricingRule } from '@/utils/serialize';

export type PricingRuleInput = Omit<PricingRule, 'id'>;

function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function listPricing(): Promise<PricingRule[]> {
  const rules = await prisma.pricingRule.findMany({
    orderBy: [{ priority: 'desc' }, { startTime: 'asc' }],
  });
  return rules.map(serializePricingRule);
}

export async function createPricing(input: PricingRuleInput): Promise<PricingRule> {
  const rule = await prisma.pricingRule.create({
    data: {
      courtId: input.courtId ? input.courtId : null,
      weekday: input.weekday ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      currency: input.currency,
      validFrom: toDate(input.validFrom) ?? new Date(),
      validTo: toDate(input.validTo) ?? null,
      isActive: input.isActive,
      priority: input.priority,
    },
  });
  return serializePricingRule(rule);
}

export async function updatePricing(
  id: string,
  input: Partial<PricingRule>,
): Promise<PricingRule> {
  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) throw notFound('Tarifa no encontrada.', 'PRICING_NOT_FOUND');

  const rule = await prisma.pricingRule.update({
    where: { id },
    data: {
      ...(input.courtId !== undefined ? { courtId: input.courtId ? input.courtId : null } : {}),
      ...(input.weekday !== undefined ? { weekday: input.weekday ?? null } : {}),
      ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.validFrom !== undefined ? { validFrom: toDate(input.validFrom) ?? existing.validFrom } : {}),
      ...(input.validTo !== undefined ? { validTo: toDate(input.validTo) ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
    },
  });
  return serializePricingRule(rule);
}

export async function deletePricing(id: string): Promise<void> {
  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) throw notFound('Tarifa no encontrada.', 'PRICING_NOT_FOUND');
  await prisma.pricingRule.delete({ where: { id } });
}

function labelForStart(startTime: string): string {
  const minutes = minutesFromTime(startTime);
  if (minutes < 12 * 60) return 'Mañana';
  if (minutes < 19 * 60) return 'Tarde';
  return 'Noche';
}

function daysLabel(weekday: number | null): string {
  if (weekday === null) return 'Todos los días';
  if (weekday === 0 || weekday === 6) return 'Fines de semana';
  return 'Lunes a viernes';
}

/** Cartelera pública de precios, derivada de las tarifas activas. */
export async function getPricingDisplay(): Promise<PricingDisplayRow[]> {
  const rules = await prisma.pricingRule.findMany({
    where: { isActive: true },
    orderBy: { startTime: 'asc' },
  });

  const seen = new Set<string>();
  const rows: PricingDisplayRow[] = [];

  for (const rule of rules) {
    const label = labelForStart(rule.startTime);
    const days = daysLabel(rule.weekday);
    const key = `${label}|${days}|${rule.durationMinutes}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      label,
      days,
      durationMinutes: rule.durationMinutes,
      priceCents: rule.priceCents,
      currency: rule.currency,
    });
  }

  return rows;
}
