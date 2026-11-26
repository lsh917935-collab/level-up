-- =====================================================================
-- Level Up : Supabase 스키마 + 권한(RLS) + 시연 데이터
-- 사용법: Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run
-- 여러 번 실행해도 안전하도록 작성되어 있습니다(시연 데이터는 1회만 생성).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. 테이블
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null default '',
  role text not null default 'student' check (role in ('teacher','student')),
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (class_id, student_id)
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  grade text not null default '중3',
  unit text not null default '',
  time_limit int not null default 20,
  status text not null default 'draft' check (status in ('draft','published')),
  low_cut int not null default 60,   -- 이 값 미만: 보충
  high_cut int not null default 85,  -- 이 값 이상: 심화
  min_items int not null default 2,  -- 영역 판정에 필요한 최소 문항 수
  due_days int not null default 7,   -- 과제 제출 기한(일)
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  purpose text not null default 'main' check (purpose in ('main','retest')),
  position int not null default 1,
  content text not null,
  qtype text not null check (qtype in ('mc','short','fix')),
  options jsonb,
  answer text not null,               -- 정답(여러 개는 | 로 구분)
  points int not null default 10,
  area text not null,
  difficulty text not null default '중' check (difficulty in ('하','중','상')),
  explanation text not null default ''
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,     -- {문항id: true/false}
  area_stats jsonb not null default '{}'::jsonb,  -- {영역: {earned,total,count,rate,pending}}
  score int not null default 0,
  total int not null default 0,
  rate numeric not null default 0,
  submitted_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  area text not null,
  level text not null check (level in ('보충','기본','심화')),
  rate numeric,
  reason text not null default '',
  title text not null default '',
  goal text not null default '',
  items jsonb,                         -- null 이면 앱 기본 과제 은행 사용
  status text not null default 'assigned' check (status in ('assigned','submitted')),
  manual boolean not null default false,  -- 교사가 직접 수정/추가한 과제
  due_date date,
  answers jsonb,
  score int,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.retests (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete set null,
  class_id uuid not null references public.classes(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  area text not null,
  answers jsonb not null default '{}'::jsonb,
  correct int not null default 0,
  total int not null default 0,
  rate numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_assessment on public.questions(assessment_id);
create index if not exists idx_submissions_assessment on public.submissions(assessment_id);
create index if not exists idx_assignments_student on public.assignments(student_id);
create index if not exists idx_assignments_assessment on public.assignments(assessment_id);

-- ---------------------------------------------------------------------
-- 2. 권한 판별 함수 (RLS 순환 참조 방지를 위해 security definer)
-- ---------------------------------------------------------------------
create or replace function public.is_teacher() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher')
$$;

create or replace function public.teaches_class(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from classes where id = cid and teacher_id = auth.uid())
$$;

create or replace function public.in_class(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from class_members where class_id = cid and student_id = auth.uid())
$$;

create or replace function public.owns_assessment(aid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from assessments a join classes c on c.id = a.class_id
    where a.id = aid and c.teacher_id = auth.uid())
$$;

create or replace function public.student_can_see_assessment(aid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from assessments a join class_members m on m.class_id = a.class_id
    where a.id = aid and a.status = 'published' and m.student_id = auth.uid())
$$;

create or replace function public.teacher_sees_student(sid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from class_members m join classes c on c.id = m.class_id
    where m.student_id = sid and c.teacher_id = auth.uid())
$$;

-- 교사가 이메일로 학생을 학급에 추가
create or replace function public.add_student_by_email(cid uuid, student_email text)
returns text language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if not teaches_class(cid) then raise exception '권한이 없습니다.'; end if;
  select id into sid from profiles
   where lower(email) = lower(trim(student_email)) and role = 'student';
  if sid is null then return 'not_found'; end if;
  insert into class_members(class_id, student_id) values (cid, sid) on conflict do nothing;
  return 'ok';
end $$;

-- ---------------------------------------------------------------------
-- 3. 회원가입 시 프로필 자동 생성 (항상 학생으로 생성: 교사 권한은 직접 부여)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), 'student')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. RLS 정책
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.classes        enable row level security;
alter table public.class_members  enable row level security;
alter table public.assessments    enable row level security;
alter table public.questions      enable row level security;
alter table public.submissions    enable row level security;
alter table public.assignments    enable row level security;
alter table public.retests        enable row level security;

-- profiles
drop policy if exists p_profiles_select on public.profiles;
create policy p_profiles_select on public.profiles for select
  using (id = auth.uid() or teacher_sees_student(id));

-- classes
drop policy if exists p_classes_select on public.classes;
create policy p_classes_select on public.classes for select
  using (teacher_id = auth.uid() or in_class(id));
drop policy if exists p_classes_insert on public.classes;
create policy p_classes_insert on public.classes for insert
  with check (teacher_id = auth.uid() and is_teacher());
drop policy if exists p_classes_update on public.classes;
create policy p_classes_update on public.classes for update
  using (teacher_id = auth.uid());
drop policy if exists p_classes_delete on public.classes;
create policy p_classes_delete on public.classes for delete
  using (teacher_id = auth.uid());

-- class_members
drop policy if exists p_members_select on public.class_members;
create policy p_members_select on public.class_members for select
  using (student_id = auth.uid() or teaches_class(class_id));
drop policy if exists p_members_insert on public.class_members;
create policy p_members_insert on public.class_members for insert
  with check (teaches_class(class_id));
drop policy if exists p_members_delete on public.class_members;
create policy p_members_delete on public.class_members for delete
  using (teaches_class(class_id));

-- assessments
drop policy if exists p_asm_teacher on public.assessments;
create policy p_asm_teacher on public.assessments for all
  using (teaches_class(class_id)) with check (teaches_class(class_id));
drop policy if exists p_asm_student on public.assessments;
create policy p_asm_student on public.assessments for select
  using (status = 'published' and in_class(class_id));

-- questions
drop policy if exists p_q_teacher on public.questions;
create policy p_q_teacher on public.questions for all
  using (owns_assessment(assessment_id)) with check (owns_assessment(assessment_id));
drop policy if exists p_q_student on public.questions;
create policy p_q_student on public.questions for select
  using (student_can_see_assessment(assessment_id));

-- submissions
drop policy if exists p_sub_student_select on public.submissions;
create policy p_sub_student_select on public.submissions for select
  using (student_id = auth.uid() or teaches_class(class_id));
drop policy if exists p_sub_student_insert on public.submissions;
create policy p_sub_student_insert on public.submissions for insert
  with check (student_id = auth.uid() and student_can_see_assessment(assessment_id));
drop policy if exists p_sub_teacher_delete on public.submissions;
create policy p_sub_teacher_delete on public.submissions for delete
  using (teaches_class(class_id));

-- assignments
drop policy if exists p_asg_select on public.assignments;
create policy p_asg_select on public.assignments for select
  using (student_id = auth.uid() or teaches_class(class_id));
drop policy if exists p_asg_teacher_all on public.assignments;
create policy p_asg_teacher_all on public.assignments for all
  using (teaches_class(class_id)) with check (teaches_class(class_id));
drop policy if exists p_asg_student_insert on public.assignments;
create policy p_asg_student_insert on public.assignments for insert
  with check (
    student_id = auth.uid() and manual = false
    and exists (select 1 from submissions s
                where s.assessment_id = assignments.assessment_id and s.student_id = auth.uid()));
drop policy if exists p_asg_student_update on public.assignments;
create policy p_asg_student_update on public.assignments for update
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- retests
drop policy if exists p_rt_select on public.retests;
create policy p_rt_select on public.retests for select
  using (student_id = auth.uid() or teaches_class(class_id));
drop policy if exists p_rt_insert on public.retests;
create policy p_rt_insert on public.retests for insert
  with check (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5. 시연 데이터 (가상의 중3 1반, 학생 6명, 과거시제 형성평가)
--    계정: teacher@levelup.demo / student1~6@levelup.demo  (비밀번호 levelup1234)
-- ---------------------------------------------------------------------
do $seed$
declare
  v_teacher uuid := gen_random_uuid();
  v_class   uuid := gen_random_uuid();
  v_asm     uuid := gen_random_uuid();
  v_pw      text := crypt('levelup1234', gen_salt('bf'));
  names     text[] := array['김민준','이서연','박지호','최유나','정도윤','한소율'];
  wrongs    text[] := array['4,5','5,8,9','1,2,10,11,12','6,9,12','4,5,6,7,13','3,8'];
  wans      text[] := array['play','study','He watch TV last night.','seen','goed',
                            'She buyed a new bag yesterday.','Do','Does','Did you went to school yesterday.',
                            'don''t','opened','She didn''t liked the movie.','tomorrow'];
  sids      uuid[] := '{}';
  v_sid     uuid;
  v_wrong   int[];
  q         record;
  r         record;
  v_answers jsonb;
  v_results jsonb;
  v_stats   jsonb;
  v_score   int;
  v_total   int;
  v_level   text;
  i         int;
begin
  if exists (select 1 from auth.users where email = 'teacher@levelup.demo') then
    raise notice '시연 데이터가 이미 존재하여 건너뜁니다.';
    return;
  end if;

  -- 교사 계정
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_teacher, 'authenticated', 'authenticated',
    'teacher@levelup.demo', v_pw, now(),
    '{"provider":"email","providers":["email"]}', '{"name":"박영어 선생님"}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_teacher,
    jsonb_build_object('sub', v_teacher::text, 'email', 'teacher@levelup.demo'),
    'email', v_teacher::text, now(), now(), now());
  update public.profiles set role = 'teacher', name = '박영어 선생님' where id = v_teacher;

  insert into classes (id, name, teacher_id) values (v_class, '3학년 1반', v_teacher);

  insert into assessments (id, class_id, title, grade, unit, time_limit, status)
  values (v_asm, v_class, '과거시제 형성평가', '중3', 'Lesson 3. 과거시제', 20, 'published');

  -- 본 평가 13문항 (영역당 3문항 + '시간 표현' 1문항은 판정 보류 시연용)
  insert into questions (assessment_id, purpose, position, content, qtype, options, answer, points, area, difficulty, explanation)
  select v_asm, 'main', p, c, t, o::jsonb, a, 10, ar, d, e from (values
    (1,'We ____ soccer after school yesterday.','mc','["play","plays","played","playing"]','played','일반동사 과거형','하','yesterday가 있으므로 과거형 played(-ed)를 씁니다.'),
    (2,'Write the past form of "study".','short',null,'studied','일반동사 과거형','중','자음+y로 끝나는 동사는 y를 i로 바꾸고 -ed를 붙입니다.'),
    (3,'다음 문장을 바르게 고쳐 쓰세요: He watch TV last night.','fix',null,'He watched TV last night.','일반동사 과거형','중','last night은 과거를 나타내므로 watch → watched.'),
    (4,'I ____ a movie with my friends last Sunday.','mc','["see","saw","seen","seed"]','saw','불규칙 동사','하','see의 과거형은 saw입니다.'),
    (5,'Write the past form of "go".','short',null,'went','불규칙 동사','하','go - went - gone'),
    (6,'다음 문장을 바르게 고쳐 쓰세요: She buyed a new bag yesterday.','fix',null,'She bought a new bag yesterday.','불규칙 동사','중','buy의 과거형은 bought입니다(buyed ✗).'),
    (7,'____ you eat breakfast this morning?','mc','["Do","Did","Does","Were"]','Did','의문문 구성','하','과거 일반동사 의문문은 Did + 주어 + 동사원형입니다.'),
    (8,'빈칸에 알맞은 말: ____ she visit Jeju last summer?','short',null,'Did','의문문 구성','중','과거 의문문이므로 Did를 씁니다.'),
    (9,'다음 문장을 바르게 고쳐 쓰세요: Did you went to school yesterday?','fix',null,'Did you go to school yesterday?','의문문 구성','상','Did 뒤에는 동사원형(go)을 씁니다.'),
    (10,'I ____ finish my homework yesterday.','mc','["don''t","didn''t","wasn''t","not"]','didn''t','부정문 구성','하','과거 부정문은 didn''t + 동사원형입니다.'),
    (11,'He did not ____ the door. (open)','short',null,'open','부정문 구성','중','did not 뒤에는 동사원형을 씁니다.'),
    (12,'다음 문장을 바르게 고쳐 쓰세요: She didn''t liked the movie.','fix',null,'She didn''t like the movie.','부정문 구성','상','didn''t 뒤에는 동사원형(like)을 씁니다.'),
    (13,'Choose the past time expression.','mc','["tomorrow","next week","last night","now"]','last night','시간 표현','하','last night은 과거를 나타내는 표현입니다.')
  ) as v(p,c,t,o,a,ar,d,e);

  -- 재평가 문항(영역당 2문항)
  insert into questions (assessment_id, purpose, position, content, qtype, options, answer, points, area, difficulty, explanation)
  select v_asm, 'retest', p, c, t, o::jsonb, a, 10, ar, '중', e from (values
    (101,'Write the past form of "walk".','short',null,'walked','일반동사 과거형','규칙 동사는 -ed를 붙입니다.'),
    (102,'They ____ tennis last weekend.','mc','["play","plays","played","playing"]','played','일반동사 과거형','last weekend → 과거형.'),
    (103,'Write the past form of "eat".','short',null,'ate','불규칙 동사','eat - ate - eaten'),
    (104,'I ____ a cake yesterday. (make)','mc','["make","maked","made","making"]','made','불규칙 동사','make의 과거형은 made입니다.'),
    (105,'____ he call you last night?','mc','["Do","Did","Does","Was"]','Did','의문문 구성','과거 의문문은 Did로 시작합니다.'),
    (106,'다음 문장을 고쳐 쓰세요: Did she visited Busan?','fix',null,'Did she visit Busan?','의문문 구성','Did 뒤에는 동사원형.'),
    (107,'She ____ call me yesterday.','mc','["don''t","didn''t","doesn''t","wasn''t"]','didn''t','부정문 구성','과거 부정문은 didn''t + 동사원형.'),
    (108,'다음 문장을 고쳐 쓰세요: He didn''t went home.','fix',null,'He didn''t go home.','부정문 구성','didn''t 뒤에는 동사원형.')
  ) as v(p,c,t,o,a,ar,e);

  -- 학생 6명 + 제출 결과 + 영역별 과제 자동 배정
  for i in 1..6 loop
    v_sid := gen_random_uuid();
    sids := sids || v_sid;

    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', v_sid, 'authenticated', 'authenticated',
      'student' || i || '@levelup.demo', v_pw, now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('name', names[i]), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_sid,
      jsonb_build_object('sub', v_sid::text, 'email', 'student' || i || '@levelup.demo'),
      'email', v_sid::text, now(), now(), now());

    insert into class_members (class_id, student_id) values (v_class, v_sid);

    v_wrong := string_to_array(wrongs[i], ',')::int[];
    v_answers := '{}'::jsonb;
    v_results := '{}'::jsonb;
    for q in select * from questions where assessment_id = v_asm and purpose = 'main' order by position loop
      if q.position = any (v_wrong) then
        v_answers := v_answers || jsonb_build_object(q.id::text, wans[q.position]);
        v_results := v_results || jsonb_build_object(q.id::text, false);
      else
        v_answers := v_answers || jsonb_build_object(q.id::text, q.answer);
        v_results := v_results || jsonb_build_object(q.id::text, true);
      end if;
    end loop;

    select jsonb_object_agg(area, jsonb_build_object(
             'earned', earned, 'total', total, 'count', cnt,
             'rate', round(earned * 100.0 / total), 'pending', cnt < 2))
      into v_stats
      from (select qq.area, count(*) as cnt, sum(qq.points) as total,
                   sum(case when (v_results ->> qq.id::text)::boolean then qq.points else 0 end) as earned
              from questions qq
             where qq.assessment_id = v_asm and qq.purpose = 'main'
             group by qq.area) s;

    select sum(case when (v_results ->> qq.id::text)::boolean then qq.points else 0 end), sum(qq.points)
      into v_score, v_total
      from questions qq where qq.assessment_id = v_asm and qq.purpose = 'main';

    insert into submissions (class_id, assessment_id, student_id, answers, results, area_stats, score, total, rate)
    values (v_class, v_asm, v_sid, v_answers, v_results, v_stats, v_score, v_total, round(v_score * 100.0 / v_total));

    for r in select key as area, value as v from jsonb_each(v_stats) loop
      continue when (r.v ->> 'pending')::boolean;
      v_level := case when (r.v ->> 'rate')::numeric < 60 then '보충'
                      when (r.v ->> 'rate')::numeric >= 85 then '심화' else '기본' end;
      insert into assignments (class_id, assessment_id, student_id, area, level, rate, reason, title, due_date)
      values (v_class, v_asm, v_sid, r.area, v_level, (r.v ->> 'rate')::numeric,
        format('%s 영역 정답률 %s%%(%s/%s점)로, 기준(60%% 미만 보충 / 85%% 이상 심화)에 따라 %s학습이 자동 배정되었습니다.',
               r.area, r.v ->> 'rate', r.v ->> 'earned', r.v ->> 'total', v_level),
        format('[%s] %s학습', r.area, v_level), current_date + 7);
    end loop;
  end loop;

  -- 진행 상황 시연: 김민준 보충과제 제출 + 재평가 완료, 정도윤 심화과제 제출
  update assignments set status = 'submitted', score = 100, submitted_at = now(),
         answers = '{"0":"ate","1":"had"}'::jsonb
   where student_id = sids[1] and area = '불규칙 동사' and assessment_id = v_asm;

  insert into retests (assignment_id, class_id, assessment_id, student_id, area, answers, correct, total, rate)
  select a.id, v_class, v_asm, sids[1], '불규칙 동사', '{}'::jsonb, 2, 2, 100
    from assignments a where a.student_id = sids[1] and a.area = '불규칙 동사' and a.assessment_id = v_asm;

  update assignments set status = 'submitted', score = 50, submitted_at = now(),
         answers = '{"0":"planned","1":"x"}'::jsonb
   where student_id = sids[5] and area = '일반동사 과거형' and assessment_id = v_asm;
end
$seed$;
