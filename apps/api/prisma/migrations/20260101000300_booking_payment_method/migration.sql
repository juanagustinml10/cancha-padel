-- ---------------------------------------------------------------------------
-- Medio de pago elegido por el cliente al reservar.
-- Registra la intención (Mercado Pago / efectivo / transferencia) sin alterar
-- el flujo de cobro: el estado de pago sigue viviendo en `Payment`.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingPaymentMethod') THEN
    CREATE TYPE "BookingPaymentMethod" AS ENUM ('MERCADOPAGO', 'CASH', 'TRANSFER');
  END IF;
END
$$;

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "paymentMethod" "BookingPaymentMethod";
