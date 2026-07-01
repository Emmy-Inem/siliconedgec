
ALTER TABLE public.bootcamp_enrollments
  ALTER COLUMN email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS flexible_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_due_date date;

ALTER TABLE public.bootcamp_cohorts
  ADD COLUMN IF NOT EXISTS allow_flexible_payment boolean NOT NULL DEFAULT true;
