
-- Restore all public-schema triggers that were dropped. Safe to run repeatedly.

-- ============ updated_at stampers ============
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'updated_at' AND a.attnum > 0
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON public.%1$I;
       CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- ============ Courses ============
DROP TRIGGER IF EXISTS trg_set_course_slug ON public.courses;
CREATE TRIGGER trg_set_course_slug BEFORE INSERT OR UPDATE OF title, slug ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_course_slug();

-- ============ Enrollments ============
DROP TRIGGER IF EXISTS trg_sync_students_enrolled ON public.enrollments;
CREATE TRIGGER trg_sync_students_enrolled AFTER INSERT OR DELETE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.sync_students_enrolled();

DROP TRIGGER IF EXISTS trg_issue_certificate ON public.enrollments;
CREATE TRIGGER trg_issue_certificate AFTER UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.issue_certificate_on_completion();

DROP TRIGGER IF EXISTS trg_notify_course_completion ON public.enrollments;
CREATE TRIGGER trg_notify_course_completion AFTER UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.notify_course_completion();

DROP TRIGGER IF EXISTS trg_award_course_xp ON public.enrollments;
CREATE TRIGGER trg_award_course_xp AFTER UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.award_course_xp();

DROP TRIGGER IF EXISTS trg_auto_join_cohort ON public.enrollments;
CREATE TRIGGER trg_auto_join_cohort AFTER INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.auto_join_course_cohort();

DROP TRIGGER IF EXISTS trg_prevent_self_paid ON public.enrollments;
CREATE TRIGGER trg_prevent_self_paid BEFORE INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_paid_enrollment();

-- ============ Lesson progress ============
DROP TRIGGER IF EXISTS trg_enforce_lesson_unlock ON public.lesson_progress;
CREATE TRIGGER trg_enforce_lesson_unlock BEFORE INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lesson_unlock_order();

DROP TRIGGER IF EXISTS trg_recompute_enrollment_progress ON public.lesson_progress;
CREATE TRIGGER trg_recompute_enrollment_progress AFTER INSERT OR UPDATE OR DELETE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.recompute_enrollment_progress();

DROP TRIGGER IF EXISTS trg_touch_last_lesson ON public.lesson_progress;
CREATE TRIGGER trg_touch_last_lesson AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_enrollment_last_lesson();

DROP TRIGGER IF EXISTS trg_notify_next_lesson_unlock ON public.lesson_progress;
CREATE TRIGGER trg_notify_next_lesson_unlock AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.notify_next_lesson_unlock();

DROP TRIGGER IF EXISTS trg_award_lesson_xp ON public.lesson_progress;
CREATE TRIGGER trg_award_lesson_xp AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.award_lesson_xp();

-- ============ Assignments / submissions ============
DROP TRIGGER IF EXISTS trg_enforce_manual_visibility ON public.assignments;
CREATE TRIGGER trg_enforce_manual_visibility BEFORE INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_manual_assignment_visibility();

DROP TRIGGER IF EXISTS trg_notify_assignment_published ON public.assignments;
CREATE TRIGGER trg_notify_assignment_published AFTER INSERT OR UPDATE OF is_visible ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_published();

DROP TRIGGER IF EXISTS trg_notify_submission ON public.assignment_submissions;
CREATE TRIGGER trg_notify_submission AFTER INSERT OR UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_submission();

DROP TRIGGER IF EXISTS trg_protect_submission_grading ON public.assignment_submissions;
CREATE TRIGGER trg_protect_submission_grading BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_grading_fields();

-- ============ Quizzes ============
DROP TRIGGER IF EXISTS trg_notify_quiz_published ON public.quizzes;
CREATE TRIGGER trg_notify_quiz_published AFTER INSERT OR UPDATE OF is_visible ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.notify_quiz_published();

-- ============ Course announcements & live classes ============
DROP TRIGGER IF EXISTS trg_notify_course_announcement ON public.course_announcements;
CREATE TRIGGER trg_notify_course_announcement AFTER INSERT ON public.course_announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_course_announcement();

DROP TRIGGER IF EXISTS trg_notify_live_class ON public.live_classes;
CREATE TRIGGER trg_notify_live_class AFTER INSERT OR UPDATE ON public.live_classes
  FOR EACH ROW EXECUTE FUNCTION public.notify_live_class_scheduled();

-- ============ Cohort activity ============
DROP TRIGGER IF EXISTS trg_notify_cohort_post ON public.cohort_posts;
CREATE TRIGGER trg_notify_cohort_post AFTER INSERT ON public.cohort_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_cohort_post();

DROP TRIGGER IF EXISTS trg_notify_cohort_session ON public.cohort_sessions;
CREATE TRIGGER trg_notify_cohort_session AFTER INSERT OR UPDATE ON public.cohort_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_cohort_session();

DROP TRIGGER IF EXISTS trg_protect_rsvp ON public.cohort_session_rsvps;
CREATE TRIGGER trg_protect_rsvp BEFORE UPDATE ON public.cohort_session_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.protect_rsvp_attendance_fields();

DROP TRIGGER IF EXISTS trg_sync_cohort_only_enrolled ON public.cohort_members;
CREATE TRIGGER trg_sync_cohort_only_enrolled AFTER INSERT OR DELETE ON public.cohort_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_cohort_only_students_enrolled();

-- ============ Comments / jobs / chat / registrations ============
DROP TRIGGER IF EXISTS trg_notify_comment_reply ON public.lesson_comments;
CREATE TRIGGER trg_notify_comment_reply AFTER INSERT ON public.lesson_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_lesson_comment_reply();

DROP TRIGGER IF EXISTS trg_notify_app_status ON public.job_applications;
CREATE TRIGGER trg_notify_app_status AFTER UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_status_change();

DROP TRIGGER IF EXISTS trg_sync_job_apps ON public.job_applications;
CREATE TRIGGER trg_sync_job_apps AFTER INSERT OR DELETE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_jobs_applications_count();

DROP TRIGGER IF EXISTS trg_chat_on_message ON public.chat_messages;
CREATE TRIGGER trg_chat_on_message AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_on_message();

DROP TRIGGER IF EXISTS trg_auto_enroll_registration ON public.course_registrations;
CREATE TRIGGER trg_auto_enroll_registration AFTER INSERT ON public.course_registrations
  FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_on_registration();

DROP TRIGGER IF EXISTS trg_influencer_referral_reg ON public.course_registrations;
CREATE TRIGGER trg_influencer_referral_reg AFTER INSERT ON public.course_registrations
  FOR EACH ROW EXECUTE FUNCTION public.auto_record_influencer_referral();

DROP TRIGGER IF EXISTS trg_influencer_referral_order ON public.orders;
CREATE TRIGGER trg_influencer_referral_order AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_record_influencer_referral_order();

DROP TRIGGER IF EXISTS trg_sync_promo_usage ON public.influencer_referrals;
CREATE TRIGGER trg_sync_promo_usage AFTER INSERT OR UPDATE OR DELETE ON public.influencer_referrals
  FOR EACH ROW EXECUTE FUNCTION public.sync_promo_usage_count();
