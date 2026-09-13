-- 학교마다 다른 교시 시각을 담아요.
--
-- NEIS에는 이 정보가 없어요. 시간표 API는 학년·반·교시·과목명만 줘요.
-- 몇 시에 종이 치는지는 어디에도 공개돼 있지 않아요.
--
-- 그래서 그 학교 선생님이 앱에서 한 번 넣어요. 그러면 그 학교 학생 전부가
-- 그 값을 써요. 아무도 안 넣은 학교는 앱이 시각을 아예 안 보여줘요.
-- 예전에는 코드에 08:40 시작 7교시라고 박아뒀는데, 그건 어느 학교 것도
-- 아니었어요. 서일여고는 08:10 시작에 8교시까지예요.
--
-- 열쇠는 (office, school) 이에요. 학교 하나에 시각표 하나예요.
create table if not exists public.school_bells (
  -- 시도교육청코드('G10')와 표준학교코드('7430062')
  office text not null,
  school text not null,

  -- [{ "period": 1, "start": "08:10", "end": "09:00" }, ...]
  --
  -- 표로 안 쪼개고 통째로 담아요. 늘 한 덩어리로 읽고 한 덩어리로 바꿔요.
  -- 3교시만 따로 물어보는 화면이 없어요. 쪼개두면 "5교시를 지웠다" 같은
  -- 중간 상태가 생기는데, 그 사이에 학생이 열면 시간표에 구멍이 보여요.
  periods jsonb not null,

  -- 점심이 몇 교시 뒤인지. 0이면 점심 줄을 안 그려요.
  lunch_after int not null default 0,

  -- 누가 넣었는지. 틀린 값이 올라왔을 때 물어볼 데가 있어야 해요.
  updated_by uuid references public.profiles(id) on delete set null,
  updated_by_name text,
  updated_at timestamptz not null default now(),

  primary key (office, school)
);

-- 앱이 직접 못 건드려요. 함수만 service_role 키로 만져요.
-- 아무나 쓸 수 있으면 남의 학교 시간표 시각을 바꿔놓을 수 있어요.
alter table public.school_bells enable row level security;

grant usage on schema public to service_role;
-- update 가 꼭 있어야 해요. 넣는 건 늘 덮어쓰기(upsert)라서요.
-- 예전에 이걸 빠뜨려서 두 번 데었어요. (assessments, push_subs)
grant select, insert, update, delete on public.school_bells to service_role;

-- 서일여고 2026학년도 시각이에요. 컴시간 시간표에 적힌 시작 시각을 옮겼어요.
-- 끝나는 시각은 거기 안 나와 있어서 50분 수업으로 뒀어요. 다르면 선생님이
-- 앱에서 고치면 돼요. 그러라고 만든 화면이에요.
insert into public.school_bells (office, school, periods, lunch_after, updated_by_name)
values (
  'G10',
  '7430062',
  '[{"period":1,"start":"08:10","end":"09:00"},
    {"period":2,"start":"09:10","end":"10:00"},
    {"period":3,"start":"10:10","end":"11:00"},
    {"period":4,"start":"11:10","end":"12:00"},
    {"period":5,"start":"13:00","end":"13:50"},
    {"period":6,"start":"14:00","end":"14:50"},
    {"period":7,"start":"15:10","end":"16:00"},
    {"period":8,"start":"16:00","end":"16:50"}]'::jsonb,
  4,
  '처음 넣어둔 값'
)
on conflict (office, school) do nothing;

notify pgrst, 'reload schema';
