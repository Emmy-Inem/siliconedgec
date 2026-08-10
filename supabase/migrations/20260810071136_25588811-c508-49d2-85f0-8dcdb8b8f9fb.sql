CREATE OR REPLACE FUNCTION public.protect_support_ticket_staff_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.bypass_thread_guard', true), '') = 'on'
     OR auth.uid() IS NULL
     OR public.has_any_role(auth.uid(), ARRAY['admin','moderator','support']::app_role[]) THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.priority := OLD.priority;
  NEW.category := OLD.category;
  NEW.source := OLD.source;
  NEW.assigned_to := OLD.assigned_to;
  NEW.resolution_note := OLD.resolution_note;
  NEW.resolved_at := OLD.resolved_at;
  NEW.ticket_number := OLD.ticket_number;
  NEW.user_id := OLD.user_id;
  NEW.unread_admin_count := OLD.unread_admin_count;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_chat_conversation_staff_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.bypass_thread_guard', true), '') = 'on'
     OR auth.uid() IS NULL
     OR public.has_any_role(auth.uid(), ARRAY['admin','moderator','support']::app_role[]) THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.assigned_to := OLD.assigned_to;
  NEW.unread_admin_count := OLD.unread_admin_count;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_support_ticket_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.bypass_thread_guard', 'on', true);
  UPDATE public.support_tickets
  SET last_activity_at = now(),
      updated_at = now(),
      unread_admin_count = CASE WHEN NEW.sender_role = 'user' THEN unread_admin_count + 1 ELSE unread_admin_count END,
      unread_user_count = CASE WHEN NEW.sender_role = 'admin' AND NEW.is_internal = false THEN unread_user_count + 1 ELSE unread_user_count END,
      status = CASE
        WHEN NEW.sender_role = 'user' AND status IN ('resolved','closed') THEN 'open'
        WHEN NEW.sender_role = 'admin' AND status = 'open' THEN 'pending'
        ELSE status END
  WHERE id = NEW.ticket_id;
  PERFORM set_config('app.bypass_thread_guard', 'off', true);
  RETURN NEW;
END;
$$;