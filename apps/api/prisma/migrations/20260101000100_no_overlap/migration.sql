-- ---------------------------------------------------------------------------
-- Restricciones de integridad que Prisma no puede expresar de forma declarativa.
-- Esta migración es 100% SQL y no requiere lógica de aplicación.
-- ---------------------------------------------------------------------------

-- btree_gist habilita el índice GiST sobre columnas escalares ("courtId"),
-- necesario para la restricción de exclusión de solapamiento por cancha.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Anti doble-reserva a nivel de base de datos:
-- dos reservas ACTIVAS (pendiente de pago o confirmada) de la misma cancha
-- no pueden solaparse en el tiempo. El rango es [startsAt, endsAt).
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    "courtId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING_PAYMENT', 'CONFIRMED'));

-- Validaciones básicas de coherencia temporal y de montos.
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_time_order" CHECK ("endsAt" > "startsAt");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_deposit_range"
  CHECK ("depositAmountCents" >= 0 AND "depositAmountCents" <= "priceTotalCents");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_paid_non_negative" CHECK ("paidAmountCents" >= 0);

ALTER TABLE "CourtBlock"
  ADD CONSTRAINT "CourtBlock_time_order" CHECK ("endsAt" > "startsAt");
