DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentProvider' AND e.enumlabel = 'MANUAL'
  ) THEN
    ALTER TYPE "PaymentProvider" ADD VALUE 'MANUAL';
  END IF;
END
$$;
