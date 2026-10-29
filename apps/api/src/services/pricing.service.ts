import type { PricingDisplayRow, PricingRule } from '@padel/shared';
import { notFound, unprocessable } from '@/domain/errors';
import { addMinutes, clubLocalToUtc, minutesFromTime } from '@/domain/time';
import { prisma } from '@/infra/prisma';
import { serializePricingRule } from '@/utils/serialize';

export type PricingRuleInput = Omit<PricingRule, 'id'>;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convierte el valor de vigencia a instante.
 *
 * - `yyyy-MM-dd` (formato que envía el panel): se interpreta en la zona horaria del club.
 *   Para `validFrom` es el inicio del día (00:00 incluida) y para `validTo` el cierre
 *   del día (00:00 del día siguiente, exclusiva), de modo que la vigencia cubre el día
 *   de fin completo sin ambigüedad de zonas horarias. Comparado con el comportamiento
 *   anterior (`new Date('yyyy-MM-dd')` → medianoche UTC = 21:00 del día anterior en
 *   Argentina), corrige el desfase de vigencia herrado cerca de medianoche.
 * - Otro formato ISO con hora/zona se respeta tal cual.
 * - Valor inválido (p. ej. texto libre): 422 explícito. Antes se degradaba en
 *   silencio (creaba con fecha "hoy" o congelaba la vigencia anterior).
 */
function parsePricingDate(
  value: string | null | undefined,
  field: 'validFrom' | 'validTo',
  endOfDay: boolean,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (DATE_ONLY_RE.test(value)) {
    const start = clubLocalToUtc(value, '00:00');
    return endOfDay ? addMinutes(start, 24 * 60) : start;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw unprocessable(
      `La fecha de vigencia (${field}) no es válida.`,
      'INVALID_PRICING_DATE',
    );
  }
  return parsed;
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
      validFrom: parsePricingDate(input.validFrom, 'validFrom', false) ?? new Date(),
      validTo: parsePricingDate(input.validTo, 'validTo', true) ?? null,
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
      ...(input.validFrom !== undefined
        ? { validFrom: parsePricingDate(input.validFrom, 'validFrom', false) ?? existing.validFrom }
        : {}),
      ...(input.validTo !== undefined
        ? { validTo: parsePricingDate(input.validTo, 'validTo', true) ?? null }
        : {}),
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
    let label = labelForStart(rule.startTime);
    const days = daysLabel(rule.weekday);
    // Asignar etiqueta 'Fin de semana' a la regla que comienza a las 00:00
    if (rule.startTime === '00:00') label = 'Fin de semana';
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
