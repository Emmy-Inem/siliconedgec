CREATE OR REPLACE FUNCTION public.protect_affiliate_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance') OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.commission_percentage := OLD.commission_percentage;
  NEW.user_id := OLD.user_id;
  NEW.code := OLD.code;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_affiliate_privileged_fields ON public.affiliates;
CREATE TRIGGER protect_affiliate_privileged_fields
BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.protect_affiliate_privileged_fields();