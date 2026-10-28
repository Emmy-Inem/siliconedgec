-- A persistent allowance per anonymous browser, shared across edge workers.
create table if not exists public.guest_coach_questions (
  visitor_id uuid not null,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (visitor_id, request_id)
);
alter table public.guest_coach_questions enable row level security;
revoke all on public.guest_coach_questions from anon, authenticated;
grant all on public.guest_coach_questions to service_role;

create or replace function public.reserve_guest_coach_question(p_visitor_id uuid, p_request_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_visitor_id::text, 0));
  if exists(select 1 from guest_coach_questions where visitor_id = p_visitor_id and request_id = p_request_id) then
    return false;
  end if;
  if (select count(*) from guest_coach_questions where visitor_id = p_visitor_id) >= 2 then
    return false;
  end if;
  insert into guest_coach_questions(visitor_id, request_id) values (p_visitor_id, p_request_id);
  return true;
end;
$$;
revoke all on function public.reserve_guest_coach_question(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_guest_coach_question(uuid, uuid) to service_role;
