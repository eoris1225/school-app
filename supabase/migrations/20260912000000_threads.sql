-- 쪽지예요. 학생이 과목을 골라 질문하면 그 과목 선생님들이 받아요.
--
-- 여태 이 기기 안에서만 오갔어요. 앱을 껐다 켜면 사라졌고, 보낸 쪽지가
-- 선생님께 갈 방법이 아예 없었어요. 로그인이 붙었으니 이제 진짜로 만들어요.
--
-- 표는 앱이 바로 못 건드려요. RLS를 켜고 정책을 안 만들어요.
-- 수행평가와 같은 방식이에요. 누가 무엇을 볼 수 있는지는 Edge Function
-- 한 곳에서만 정해요. 규칙이 두 군데 흩어지면 언젠가 어긋나요.

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),

  -- 어느 학교 것인지. 만든 사람의 프로필에서 가져와요 (앱이 보낸 값 말고요).
  school_office text not null,
  school_code   text not null,

  -- 어느 과목 선생님께 가는지
  subject text not null,

  -- 보낸 학생. 이름과 반은 보낼 때 한 번 박아둬요. 학년이 올라가도
  -- 그때 보낸 쪽지는 그때 반으로 남아 있어야 선생님이 헷갈리지 않아요.
  student_id  uuid not null references auth.users (id) on delete cascade,
  student_name text not null,
  student_cls  text not null,
  student_no   int,

  -- 안 읽은 표시. 각자 따로 둬요.
  unread_student boolean not null default false,
  unread_teacher boolean not null default true,

  created_at timestamptz not null default now(),
  -- 새 쪽지가 오면 갱신해요. 목록을 이 순서로 보여줘요.
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,

  author_id   uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  author_role text not null check (author_role in ('student', 'teacher')),

  text text not null check (length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- 선생님은 "우리 학교 + 내 담당 과목"으로 찾고, 학생은 자기 것으로 찾아요.
create index if not exists threads_for_teacher
  on public.threads (school_office, school_code, subject, updated_at desc);
create index if not exists threads_for_student
  on public.threads (student_id, updated_at desc);
create index if not exists messages_by_thread
  on public.messages (thread_id, created_at);

alter table public.threads  enable row level security;
alter table public.messages enable row level security;

-- 정책을 하나도 안 만들어요. 앱 키로는 아무것도 못 봐요.
-- 우리 함수(service_role)만 지나갈 수 있어요.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.threads  to service_role;
grant select, insert, update, delete on public.messages to service_role;

-- 프로필에 학교와 번호를 담아요.
--
-- 지금까지 학교는 기기에만 있었어요. 그러면 선생님이 설정에서 학교만
-- 바꿔서 남의 학교 학생 질문을 읽을 수 있어요. 수행평가는 공개된
-- 내용이라 넘어갔지만 쪽지는 안 돼요.
-- 그래서 쪽지는 앱이 보낸 학교를 안 믿고 이 칸만 봐요.
alter table public.profiles add column if not exists student_no int;

notify pgrst, 'reload schema';
