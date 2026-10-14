import { Prisma } from '@prisma/client';
import type { ClubInfo, SettingsPayload } from '@padel/shared';
import { env } from '@/config/env';
import { CLUB_TIMEZONE } from '@/config/constants';
import { STATIC_CLUB_CONTENT } from '@/config/content';
import { prisma } from '@/infra/prisma';
import type { DepositSettings } from '@/domain/pricing';

const SETTINGS_KEY = 'club';

export interface ClubSettings extends DepositSettings {
  clubName: string;
  bookingHoldMinutes: number;
  cancellationPolicy: string;
  bankTransferAlias: string;
  bankTransferCbu: string;
  bankTransferAccountHolder: string;
}

export const DEFAULT_SETTINGS: ClubSettings = {
  clubName: env.CLUB_NAME,
  depositMode: env.DEPOSIT_MODE,
  depositPercent: env.DEPOSIT_PERCENT,
  depositFixedAmountCents: env.DEPOSIT_FIXED_AMOUNT_CENTS,
  bookingHoldMinutes: env.BOOKING_HOLD_MINUTES,
  cancellationPolicy:
    'Podés cancelar o reprogramar con al menos 24 horas de anticipación. La seña se reembolsa según las condiciones vigentes del complejo.',
  // Sin datos reales configurados: el cliente que elige transferencia verá un aviso
  // para coordinar con el complejo en lugar de datos bancarios inventados.
  bankTransferAlias: '',
  bankTransferCbu: '',
  bankTransferAccountHolder: '',
};

function mergeSettings(stored: unknown): ClubSettings {
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_SETTINGS };
  const value = stored as Partial<ClubSettings>;
  return {
    clubName: value.clubName ?? DEFAULT_SETTINGS.clubName,
    depositMode: value.depositMode === 'fixed_amount' ? 'fixed_amount' : 'percent',
    depositPercent: typeof value.depositPercent === 'number' ? value.depositPercent : DEFAULT_SETTINGS.depositPercent,
    depositFixedAmountCents:
      typeof value.depositFixedAmountCents === 'number'
        ? value.depositFixedAmountCents
        : DEFAULT_SETTINGS.depositFixedAmountCents,
    bookingHoldMinutes:
      typeof value.bookingHoldMinutes === 'number'
        ? value.bookingHoldMinutes
        : DEFAULT_SETTINGS.bookingHoldMinutes,
    cancellationPolicy: value.cancellationPolicy ?? DEFAULT_SETTINGS.cancellationPolicy,
    bankTransferAlias: value.bankTransferAlias ?? DEFAULT_SETTINGS.bankTransferAlias,
    bankTransferCbu: value.bankTransferCbu ?? DEFAULT_SETTINGS.bankTransferCbu,
    bankTransferAccountHolder:
      value.bankTransferAccountHolder ?? DEFAULT_SETTINGS.bankTransferAccountHolder,
  };
}

export async function getClubSettings(): Promise<ClubSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
  return mergeSettings(row?.value);
}

export async function updateClubSettings(input: SettingsPayload): Promise<SettingsPayload> {
  const current = await getClubSettings();
  const next: ClubSettings = {
    ...current,
    clubName: input.clubName,
    depositMode: input.depositMode,
    depositPercent: input.depositPercent,
    depositFixedAmountCents: input.depositFixedAmountCents,
    bookingHoldMinutes: input.bookingHoldMinutes,
    cancellationPolicy: input.cancellationPolicy,
    bankTransferAlias: input.bankTransferAlias ?? current.bankTransferAlias,
    bankTransferCbu: input.bankTransferCbu ?? current.bankTransferCbu,
    bankTransferAccountHolder: input.bankTransferAccountHolder ?? current.bankTransferAccountHolder,
  };

  const json = next as unknown as Prisma.InputJsonValue;
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: json },
    update: { value: json },
  });

  return toSettingsPayload(next);
}

export function toSettingsPayload(settings: ClubSettings): SettingsPayload {
  return {
    clubName: settings.clubName,
    depositMode: settings.depositMode,
    depositPercent: settings.depositPercent,
    depositFixedAmountCents: settings.depositFixedAmountCents,
    bookingHoldMinutes: settings.bookingHoldMinutes,
    cancellationPolicy: settings.cancellationPolicy,
    bankTransferAlias: settings.bankTransferAlias,
    bankTransferCbu: settings.bankTransferCbu,
    bankTransferAccountHolder: settings.bankTransferAccountHolder,
  };
}

export async function getPublicClubInfo(): Promise<ClubInfo> {
  const settings = await getClubSettings();
  return {
    name: settings.clubName,
    ...STATIC_CLUB_CONTENT,
    depositMode: settings.depositMode,
    depositPercent: settings.depositPercent,
    depositFixedAmountCents: settings.depositFixedAmountCents,
    bookingHoldMinutes: settings.bookingHoldMinutes,
    currency: env.CURRENCY,
    timezone: CLUB_TIMEZONE,
    bankTransferAlias: settings.bankTransferAlias || undefined,
    bankTransferCbu: settings.bankTransferCbu || undefined,
    bankTransferAccountHolder: settings.bankTransferAccountHolder || undefined,
  };
}
