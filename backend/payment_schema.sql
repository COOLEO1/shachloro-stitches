ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS quoted_amount BIGINT,
ADD COLUMN IF NOT EXISTS deposit_amount BIGINT,
ADD COLUMN IF NOT EXISTS amount_paid BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'not_quoted';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_quoted_amount_nonnegative'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_quoted_amount_nonnegative
        CHECK (quoted_amount IS NULL OR quoted_amount > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_deposit_amount_valid'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_deposit_amount_valid
        CHECK (deposit_amount IS NULL OR deposit_amount >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_amount_paid_nonnegative'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_amount_paid_nonnegative
        CHECK (amount_paid >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_payment_status_valid'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_payment_status_valid
        CHECK (payment_status IN ('not_quoted', 'quoted'));
    END IF;
END $$;
