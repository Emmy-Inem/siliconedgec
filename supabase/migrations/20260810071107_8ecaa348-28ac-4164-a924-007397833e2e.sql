CREATE OR REPLACE FUNCTION public.protect_support_ticket_staff_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
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

DROP TRIGGER IF EXISTS protect_support_ticket_staff_fields ON public.support_tickets;
CREATE TRIGGER protect_support_ticket_staff_fields
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.protect_support_ticket_staff_fields();

CREATE OR REPLACE FUNCTION public.protect_chat_conversation_staff_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
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

DROP TRIGGER IF EXISTS protect_chat_conversation_staff_fields ON public.chat_conversations;
CREATE TRIGGER protect_chat_conversation_staff_fields
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.protect_chat_conversation_staff_fields();