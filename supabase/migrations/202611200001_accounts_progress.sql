-- Apply to a Supabase project. No passwords or copies of auth.users are stored here.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null check (char_length(course) between 1 and 100),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  matched_count integer not null default 0 check (matched_count >= 0),
  unique (id, user_id)
);
create index practice_sessions_user_date on public.practice_sessions(user_id, started_at desc);

create table public.practice_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null,
  position integer not null check (position between 0 and 29),
  question text not null check (char_length(question) between 1 and 8000),
  topic text not null check (char_length(topic) between 1 and 100),
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  verification_status text not null default 'unverified' check (verification_status = 'unverified'),
  foreign key (session_id, user_id) references public.practice_sessions(id, user_id) on delete cascade,
  unique (session_id, position),
  unique (id, session_id, user_id)
);
create index practice_questions_owner on public.practice_questions(user_id, session_id);

create table private.question_answers (
  question_id uuid primary key references public.practice_questions(id) on delete cascade,
  solution text not null check (char_length(solution) between 1 and 4000)
);

create table public.practice_answers (
  question_id uuid primary key,
  session_id uuid not null,
  user_id uuid not null,
  answer text not null check (char_length(answer) <= 4000),
  updated_at timestamptz not null default now(),
  foreign key (question_id, session_id, user_id) references public.practice_questions(id, session_id, user_id) on delete cascade
);
create index practice_answers_owner on public.practice_answers(user_id, session_id);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique,
  session_id uuid not null,
  user_id uuid not null,
  answer text not null check (char_length(answer) <= 4000),
  matches_expected boolean not null,
  grading_status text not null check (grading_status in ('exact_match', 'needs_review', 'unanswered')),
  grading_method text not null default 'exact_text_v1' check (grading_method = 'exact_text_v1'),
  -- Reserved for a future verified checker. Text matching is not a correctness label.
  is_correct boolean check (is_correct is null),
  attempt_number integer not null default 1 check (attempt_number = 1),
  hints_used integer not null default 0 check (hints_used = 0),
  created_at timestamptz not null default now(),
  foreign key (question_id, session_id, user_id) references public.practice_questions(id, session_id, user_id) on delete cascade
);
create index practice_attempts_owner on public.practice_attempts(user_id, created_at desc);

create table private.generation_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index generation_requests_quota on private.generation_requests(user_id, created_at);

alter table public.practice_sessions enable row level security;
alter table public.practice_questions enable row level security;
alter table public.practice_answers enable row level security;
alter table public.practice_attempts enable row level security;
-- Also protect the non-exposed schema as defense in depth.
alter table private.question_answers enable row level security;
alter table private.generation_requests enable row level security;

revoke all on public.practice_sessions, public.practice_questions, public.practice_answers, public.practice_attempts from anon, authenticated;
grant select on public.practice_sessions, public.practice_questions, public.practice_answers, public.practice_attempts to authenticated;
grant all on public.practice_sessions, public.practice_questions, public.practice_answers, public.practice_attempts to service_role;
grant all on private.question_answers, private.generation_requests to service_role;
grant usage, select on all sequences in schema private to service_role;

create policy own_sessions on public.practice_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy own_questions on public.practice_questions for select to authenticated using ((select auth.uid()) = user_id);
create policy own_answers on public.practice_answers for select to authenticated using ((select auth.uid()) = user_id);
create policy own_attempts on public.practice_attempts for select to authenticated using ((select auth.uid()) = user_id);

create function private.normalize_answer(value text) returns text
language sql immutable set search_path = ''
as $$ select regexp_replace(regexp_replace(btrim(coalesce(value, '')), '^\$+|\$+$', '', 'g'), '\s+', '', 'g') $$;
revoke all on function private.normalize_answer(text) from public, anon, authenticated;

create function public.reserve_generation_request(p_user_id uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if (select count(*) from private.generation_requests where user_id = p_user_id and created_at > now() - interval '15 minutes') >= 5 then return false; end if;
  delete from private.generation_requests where user_id = p_user_id and created_at < now() - interval '1 day';
  insert into private.generation_requests(user_id) values (p_user_id);
  return true;
end;
$$;
revoke all on function public.reserve_generation_request(uuid) from public, anon, authenticated;
grant execute on function public.reserve_generation_request(uuid) to service_role;

create function public.create_practice_session(p_user_id uuid, p_course text, p_questions jsonb) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare sid uuid; qid uuid; item jsonb; n integer := 0;
begin
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) not between 1 and 30 then
    raise exception 'Invalid questions' using errcode = '22023';
  end if;
  insert into public.practice_sessions(user_id, course) values (p_user_id, p_course) returning id into sid;
  for item in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(item->'question') is distinct from 'string' or jsonb_typeof(item->'solution') is distinct from 'string'
       or jsonb_typeof(item->'topic') is distinct from 'string' or jsonb_typeof(item->'difficulty') is distinct from 'string' then
      raise exception 'Invalid question fields' using errcode = '22023';
    end if;
    insert into public.practice_questions(session_id,user_id,position,question,topic,difficulty)
      values (sid,p_user_id,n,item->>'question',item->>'topic',item->>'difficulty') returning id into qid;
    insert into private.question_answers(question_id,solution) values (qid,item->>'solution');
    n := n + 1;
  end loop;
  return sid;
end;
$$;
revoke all on function public.create_practice_session(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_practice_session(uuid,text,jsonb) to service_role;

create function public.save_practice_answers(p_session_id uuid, p_answers jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare owner_id uuid; session_status text; item record; qid uuid;
begin
  select user_id,status into owner_id,session_status from public.practice_sessions where id=p_session_id and user_id=(select auth.uid()) for update;
  if not found then raise exception 'Session not found' using errcode='P0002'; end if;
  if session_status <> 'in_progress' then raise exception 'Session already submitted' using errcode='55000'; end if;
  if jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'Invalid answers' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_answers)) > 30 then raise exception 'Too many answers' using errcode='22023'; end if;
  for item in select key,value from jsonb_each(p_answers) loop
    qid := item.key::uuid;
    if jsonb_typeof(item.value) <> 'string' or char_length(item.value #>> '{}') > 4000 then raise exception 'Invalid answer' using errcode='22023'; end if;
    if not exists (select 1 from public.practice_questions where id=qid and session_id=p_session_id and user_id=owner_id) then
      raise exception 'Question not found' using errcode='P0002';
    end if;
    insert into public.practice_answers(question_id,session_id,user_id,answer)
      values (qid,p_session_id,owner_id,item.value #>> '{}')
      on conflict (question_id) do update set answer=excluded.answer, updated_at=now();
  end loop;
end;
$$;
revoke all on function public.save_practice_answers(uuid,jsonb) from public, anon;
grant execute on function public.save_practice_answers(uuid,jsonb) to authenticated;

create function public.get_practice_review(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not exists (select 1 from public.practice_sessions where id=p_session_id and user_id=(select auth.uid()) and status='completed') then
    raise exception 'Completed session not found' using errcode='P0002';
  end if;
  select jsonb_build_object('session_id',s.id,'matched_count',s.matched_count,'completed_at',s.completed_at,
    'questions',(select jsonb_agg(jsonb_build_object('id',q.id,'question',q.question,'topic',q.topic,'difficulty',q.difficulty,
    'solution',k.solution,'answer',a.answer,'grading_status',a.grading_status,'verification_status',q.verification_status) order by q.position)
    from public.practice_questions q join private.question_answers k on k.question_id=q.id
    join public.practice_attempts a on a.question_id=q.id where q.session_id=s.id)) into result
  from public.practice_sessions s where s.id=p_session_id;
  return result;
end;
$$;
revoke all on function public.get_practice_review(uuid) from public, anon;
grant execute on function public.get_practice_review(uuid) to authenticated;

create function public.submit_practice_session(p_session_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare session_status text;
begin
  select status into session_status from public.practice_sessions where id=p_session_id and user_id=(select auth.uid()) for update;
  if not found then raise exception 'Session not found' using errcode='P0002'; end if;
  -- Retrying a successful submission returns its original immutable result.
  if session_status='completed' then return public.get_practice_review(p_session_id); end if;
  perform public.save_practice_answers(p_session_id,p_answers);
  insert into public.practice_attempts(question_id,session_id,user_id,answer,matches_expected,grading_status)
    select q.id,q.session_id,q.user_id,coalesce(d.answer,''),
      private.normalize_answer(coalesce(d.answer,'')) <> '' and private.normalize_answer(d.answer)=private.normalize_answer(k.solution),
      case when private.normalize_answer(coalesce(d.answer,''))='' then 'unanswered'
           when private.normalize_answer(d.answer)=private.normalize_answer(k.solution) then 'exact_match'
           else 'needs_review' end
    from public.practice_questions q join private.question_answers k on k.question_id=q.id
    left join public.practice_answers d on d.question_id=q.id where q.session_id=p_session_id;
  update public.practice_sessions set status='completed',completed_at=now(),matched_count=
    (select count(*) from public.practice_attempts where session_id=p_session_id and matches_expected) where id=p_session_id;
  return public.get_practice_review(p_session_id);
end;
$$;
revoke all on function public.submit_practice_session(uuid,jsonb) from public, anon;
grant execute on function public.submit_practice_session(uuid,jsonb) to authenticated;

-- Signed-in students may delete their own practice history without touching auth identity.
create function public.clear_practice_history() returns void
language sql security definer set search_path = ''
as $$ delete from public.practice_sessions where user_id=(select auth.uid()) $$;
revoke all on function public.clear_practice_history() from public, anon;
grant execute on function public.clear_practice_history() to authenticated;

create function public.get_practice_progress() returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'answered', (select count(*) from public.practice_attempts where user_id=(select auth.uid()) and grading_status<>'unanswered'),
    'matched', (select count(*) from public.practice_attempts where user_id=(select auth.uid()) and matches_expected),
    'completed', (select count(*) from public.practice_sessions where user_id=(select auth.uid()) and status='completed'),
    'topics', coalesce((select jsonb_agg(t order by t.answered desc) from (
      select s.course,q.topic,count(*) filter (where a.grading_status<>'unanswered') as answered,
        count(*) filter (where a.matches_expected) as matched
      from public.practice_attempts a join public.practice_questions q on q.id=a.question_id
      join public.practice_sessions s on s.id=a.session_id where a.user_id=(select auth.uid())
      group by s.course,q.topic
    ) t), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(t order by t.day) from (
      select (created_at at time zone 'UTC')::date as day,
        count(*) filter (where grading_status<>'unanswered') as answered
      from public.practice_attempts where user_id=(select auth.uid()) and created_at>=now()-interval '30 days'
      group by (created_at at time zone 'UTC')::date
    ) t), '[]'::jsonb)
  );
$$;
revoke all on function public.get_practice_progress() from public, anon;
grant execute on function public.get_practice_progress() to authenticated;

commit;
