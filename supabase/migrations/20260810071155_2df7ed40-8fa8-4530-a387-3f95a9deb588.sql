CREATE OR REPLACE FUNCTION public.update_chat_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.bypass_thread_guard', 'on', true);
  UPDATE public.chat_conversations SET
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at,
    unread_admin_count = CASE WHEN NEW.sender_role = 'user' THEN COALESCE(unread_admin_count,0)+1 ELSE unread_admin_count END,
    unread_user_count = CASE WHEN NEW.sender_role = 'admin' THEN COALESCE(unread_user_count,0)+1 ELSE unread_user_count END
  WHERE id = NEW.conversation_id;
  PERFORM set_config('app.bypass_thread_guard', 'off', true);
  RETURN NEW;
END;
$$;