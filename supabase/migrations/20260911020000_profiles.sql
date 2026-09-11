-- 로그인한 사람이 누구인지 담는 표예요.
--
-- 지금까지는 선생님 코드 하나로 버텼어요. 코드를 아는 사람은 누구나 선생님이고,
-- 학생이 누군지는 알 수도 없었어요. 쪽지는 "누가 보냈는지"가 핵심이라
-- 그 방식으로는 안 돼요.
--
-- 이제 계정마다 줄이 하나씩 생겨요. 그 줄에 역할과 학교, 학년·반이 담겨요.
-- 선생님 코드는 "승급할 때 한 번"만 쓰고, 그 뒤로는 계정 자체가 권한이에요.

create table if not exists public.profiles (
  -- 로그인 계정과 같은 id를 써요. 계정이 지워지면 이 줄도 같이 지워져요.
  id uuid primary key references auth.users (id) on delete cascade,

  role text not null default 'student' check (role in ('student', 'teacher')),
  name text not null default '',

  -- 어느 학교 몇 학년 몇 반인지. 학교는 NEIS 코드를 그대로 써요.
  school_office text,
  school_code   text,
  grade int check (grade between 1 and 6),
  cls   text,

  -- 선생님이면 담당 과목. 학생은 비어 있어요.
  subjects text[] not null default '{}',

  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 내 줄만 볼 수 있어요. 남의 학년·반을 들여다볼 이유가 없어요.
drop policy if exists "내 프로필 보기" on public.profiles;
create policy "내 프로필 보기" on public.profiles
  for select using (auth.uid() = id);

-- 내 줄만 고칠 수 있어요.
drop policy if exists "내 프로필 고치기" on public.profiles;
create policy "내 프로필 고치기" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

/*
 * 중요: 역할은 스스로 바꿀 수 없어요.
 *
 * 위 정책만 두면 학생이 자기 줄의 role을 'teacher'로 고쳐서 선생님이 될 수
 * 있어요. 그러면 로그인을 붙인 의미가 없어요. 그래서 role과 subjects는
 * 아래 트리거가 되돌려요. 승급은 별도 함수로만 돼요.
 */
create or replace function public.keep_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.role := old.role;
  new.subjects := old.subjects;
  return new;
end;
$$;

drop trigger if exists profiles_keep_role on public.profiles;
create trigger profiles_keep_role
  before update on public.profiles
  for each row execute function public.keep_role();

-- 회원가입하면 프로필 줄을 자동으로 만들어요. 앱이 따로 만들지 않아도 돼요.
create or replace function public.on_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.on_user_created();

-- 이 표도 권한을 직접 줘요. 새 표에 자동으로 안 붙게 해뒀거든요.
grant usage on schema public to authenticated, service_role;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

notify pgrst, 'reload schema';

/*
 * 선생님으로 올리는 유일한 길이에요.
 *
 * 위 트리거가 role 변경을 전부 되돌리기 때문에, 평범한 update로는 아무도
 * 선생님이 될 수 없어요. 이 함수만 예외로 통과시켜요.
 *
 * 함수 자체에는 암호가 없어요. 암호(TEACHER_CODE)는 Edge Function이 들고
 * 있고, 거기서 맞는지 본 뒤에만 이 함수를 불러요. 그래서 이 함수는
 * service_role 에게만 열어둬요. 앱이 직접 부를 수는 없어요.
 */
create or replace function public.promote_to_teacher(target uuid, new_subjects text[])
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 트리거를 잠깐 끄고 바꾼 뒤 다시 켜요. 이 함수 안에서만 그래요.
  alter table public.profiles disable trigger profiles_keep_role;

  return query
    update public.profiles
       set role = 'teacher',
           subjects = coalesce(new_subjects, '{}')
     where id = target
    returning *;

  alter table public.profiles enable trigger profiles_keep_role;
end;
$$;

-- 앱에서는 못 불러요. 우리 함수(service_role)만 부를 수 있어요.
revoke all on function public.promote_to_teacher(uuid, text[]) from public, anon, authenticated;
grant execute on function public.promote_to_teacher(uuid, text[]) to service_role;

notify pgrst, 'reload schema';
