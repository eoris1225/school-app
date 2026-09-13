-- 알림을 받을 곳을 담아요.
--
-- 브라우저가 "이 주소로 보내면 이 사람 폰에 뜹니다" 하는 주소를 하나 줘요.
-- 그게 endpoint 예요. 같이 오는 열쇠 둘(p256dh, auth)로 내용을 잠가서 보내요.
-- 그래야 중간에 있는 구글·애플 서버가 내용을 못 읽어요.
--
-- 한 사람이 여러 줄을 가질 수 있어요. 폰에서도 받고 노트북에서도 받으니까요.
-- endpoint 는 그 자체로 유일해서 열쇠로 걸어둬요. 같은 기기가 다시 켜면
-- 같은 주소가 오는데, 그때 새 줄을 만들면 알림이 두 번 와요.
create table if not exists public.push_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  endpoint text not null unique,
  p256dh   text not null,
  auth     text not null,

  -- 어떤 기기인지. 내 정보에서 "이 기기" 를 알아보게 하려고요.
  agent text,

  created_at timestamptz not null default now()
);

create index if not exists push_subs_user_idx on public.push_subs (user_id);

-- 앱이 직접 못 건드려요. 함수만 service_role 키로 만져요.
-- 남의 구독 주소를 읽을 수 있으면 그 사람 폰으로 알림을 보낼 수 있어요.
alter table public.push_subs enable row level security;

grant usage on schema public to service_role;
grant select, insert, delete on public.push_subs to service_role;

notify pgrst, 'reload schema';
