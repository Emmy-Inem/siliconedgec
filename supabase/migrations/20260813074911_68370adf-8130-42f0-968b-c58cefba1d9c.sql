CREATE OR REPLACE FUNCTION public.protect_affiliate_staff_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'moderator') THEN
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.commission_percentage := OLD.commission_percentage;
  NEW.approved_at := OLD.approved_at;
  NEW.code := OLD.code;
  NEW.user_id := OLD.user_id;
  NEW.notes := OLD.notes;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_affiliate_staff_fields_trg ON public.affiliates;
CREATE TRIGGER protect_affiliate_staff_fields_trg
BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.protect_affiliate_staff_fields();