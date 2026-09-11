-- 수행평가를 담는 표예요.
--
-- NEIS에는 수행평가가 없어요. 학사일정만 있어요. 그래서 선생님이 앱에서
-- 직접 등록하고, 그걸 여기에 담아요. 그래야 선생님이 등록한 걸 학생들이 봐요.
--
-- 이 표는 앱에서 바로 읽지 않아요. Edge Function만 건드려요.
-- 아래에서 RLS를 켜고 정책을 하나도 만들지 않는데, 그러면 service_role
-- (우리 함수)만 접근할 수 있어요. 앱이 들고 있는 키로는 아무것도 못 해요.

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),

  -- 어느 학교 것인지. NEIS 코드를 그대로 써요.
  school_office text not null,
  school_code   text not null,

  date    date not null,
  title   text not null,
  -- 과목. 누가 지울 수 있는지 정할 때도 써요.
  subject text,

  -- 해당되는 학년들. 비어 있으면 전 학년이에요.
  grades  int[]  not null default '{}',
  -- 해당되는 반들. 비어 있으면 고른 학년 전체예요.
  classes text[] not null default '{}',

  created_at timestamptz not null default now()
);

-- 달력은 "이 학교 이 달"로 찾아요. 그 순서대로 찾게 해둬요.
create index if not exists assessments_school_date_idx
  on public.assessments (school_office, school_code, date);

-- 정책을 하나도 만들지 않아요. 그래야 함수만 건드릴 수 있어요.
alter table public.assessments enable row level security;

-- 제목이 비었거나 너무 긴 건 담지 않아요.
alter table public.assessments
  drop constraint if exists assessments_title_len;
alter table public.assessments
  add constraint assessments_title_len
  check (char_length(trim(title)) between 1 and 100);
