REVOKE ALL ON FUNCTION public.record_affiliate_referral(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_scheduled_automations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_referral(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_scheduled_automations() TO service_role;