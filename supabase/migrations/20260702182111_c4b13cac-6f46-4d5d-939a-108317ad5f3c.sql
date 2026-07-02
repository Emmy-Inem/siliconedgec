
create table if not exists public.lesson_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  note text,
  unique (user_id, lesson_id)
);

grant select, insert, update, delete on public.lesson_unlocks to authenticated;
grant all on public.lesson_unlocks to service_role;

alter table public.lesson_unlocks enable row level security;

drop policy if exists "lesson_unlocks read own or staff" on public.lesson_unlocks;
create policy "lesson_unlocks read own or staff" on public.lesson_unlocks
  for select to authenticated using (
    auth.uid() = user_id
    or has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'moderator'::app_role)
    or has_role(auth.uid(), 'instructor'::app_role)
  );

drop policy if exists "lesson_unlocks staff manage" on public.lesson_unlocks;
create policy "lesson_unlocks staff manage" on public.lesson_unlocks
  for all to authenticated using (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'moderator'::app_role)
    or has_role(auth.uid(), 'instructor'::app_role)
  ) with check (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'moderator'::app_role)
    or has_role(auth.uid(), 'instructor'::app_role)
  );

create index if not exists idx_lesson_unlocks_user on public.lesson_unlocks(user_id);
create index if not exists idx_lesson_unlocks_lesson on public.lesson_unlocks(lesson_id);

-- Extend management rights to Instructor role
drop policy if exists "Instructors manage courses" on public.courses;
create policy "Instructors manage courses" on public.courses
  for all to authenticated
  using (has_role(auth.uid(), 'instructor'::app_role))
  with check (has_role(auth.uid(), 'instructor'::app_role));

drop policy if exists "Instructors manage modules" on public.modules;
create policy "Instructors manage modules" on public.modules
  for all to authenticated
  using (has_role(auth.uid(), 'instructor'::app_role))
  with check (has_role(auth.uid(), 'instructor'::app_role));

drop policy if exists "Instructors manage lessons" on public.lessons;
create policy "Instructors manage lessons" on public.lessons
  for all to authenticated
  using (has_role(auth.uid(), 'instructor'::app_role))
  with check (has_role(auth.uid(), 'instructor'::app_role));

drop policy if exists "Instructors manage quizzes" on public.quizzes;
create policy "Instructors manage quizzes" on public.quizzes
  for all to authenticated
  using (has_role(auth.uid(), 'instructor'::app_role))
  with check (has_role(auth.uid(), 'instructor'::app_role));

drop policy if exists "Instructors manage quiz questions" on public.quiz_questions;
create policy "Instructors manage quiz questions" on public.quiz_questions
  for all to authenticated
  using (has_role(auth.uid(), 'instructor'::app_role))
  with check (has_role(auth.uid(), 'instructor'::app_role));

drop policy if exists "Instructors manage assignments" on public.assignments;
create policy "Instructors manage assignments" on public.assignments
  for all to authenticated
  using (has_role(auth.uid(), 'instructor'::app_role))
  with check (has_role(auth.uid(), 'instructor'::app_role));

drop policy if exists "Instructors manage cohorts" on public.cohorts;
create policy "Instructors manage cohorts" on public.cohorts
  for all to authenticated
  using (has_role(auth.uid(), 'instructor'::app_role))
  with check (has_role(auth.uid(), 'instructor'::app_role));

drop policy if exists "Instructors manage cohort members" on public.cohort_members;
create policy "Instructors manage cohort members" on public.cohort_members
  for all to authenticated
  using (has_role(auth.uid(), 'instructor'::app_role))
  with check (has_role(auth.uid(), 'instructor'::app_role));

drop policy if exists "Instructors manage cohort sessions" on public.cohort_sessions;
create policy "Instructors manage cohort sessions" on public.cohort_sessions
  for all to authenticated
  using (has_role(auth.uid(), 'instructor'::app_role))
  with check (has_role(auth.uid(), 'instructor'::app_role));

drop policy if exists "Instructors manage cohort materials" on public.cohort_materials;
create policy "Instructors manage cohort materials" on public.cohort_materials
  for all to authenticated
  using (has_role(auth.uid(), 'instructor'::app_role))
  with check (has_role(auth.uid(), 'instructor'::app_role));
