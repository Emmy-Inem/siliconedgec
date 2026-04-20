-- ============ JOB BOARD ============
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  job_type TEXT NOT NULL DEFAULT 'full-time',
  salary_min NUMERIC,
  salary_max NUMERIC,
  currency TEXT DEFAULT 'NGN',
  description TEXT NOT NULL,
  requirements TEXT,
  benefits TEXT,
  application_url TEXT,
  contact_email TEXT,
  is_remote BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  posted_by UUID,
  applications_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published jobs viewable by everyone" ON public.jobs
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage jobs" ON public.jobs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications" ON public.job_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications" ON public.job_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage applications" ON public.job_applications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-increment applications_count
CREATE OR REPLACE FUNCTION public.sync_jobs_applications_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.jobs SET applications_count = COALESCE(applications_count,0)+1 WHERE id = NEW.job_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.jobs SET applications_count = GREATEST(COALESCE(applications_count,0)-1,0) WHERE id = OLD.job_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_jobs_applications_count_trigger
AFTER INSERT OR DELETE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.sync_jobs_applications_count();

-- ============ LIVE CHAT ============
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_admin_count INTEGER DEFAULT 0,
  unread_user_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.chat_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON public.chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.chat_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all conversations" ON public.chat_conversations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages" ON public.chat_messages
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Participants can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage messages" ON public.chat_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Update conversation last_message_at + unread counts when message inserted
CREATE OR REPLACE FUNCTION public.update_chat_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_conversations SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at,
    unread_admin_count = CASE WHEN NEW.sender_role = 'user' THEN COALESCE(unread_admin_count,0)+1 ELSE unread_admin_count END,
    unread_user_count = CASE WHEN NEW.sender_role = 'admin' THEN COALESCE(unread_user_count,0)+1 ELSE unread_user_count END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_chat_on_message_trigger
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.update_chat_on_message();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;

-- ============ BRUTE-FORCE PROTECTION ============
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_email_time ON public.login_attempts(email, created_at DESC);
CREATE INDEX idx_login_attempts_ip_time ON public.login_attempts(ip_address, created_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login attempts" ON public.login_attempts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Function: check if email/IP is locked out (5 fails in last 15 min)
CREATE OR REPLACE FUNCTION public.is_login_locked(_email TEXT, _ip TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT COUNT(*) AS fails FROM public.login_attempts
      WHERE success = false 
        AND created_at > now() - interval '15 minutes'
        AND (email = _email OR ip_address = _ip)
    ) t WHERE t.fails >= 5
  );
$$;