-- 쪽지에 사진을 붙일 수 있게 해요.
--
-- 글로만 설명하기 어려운 질문이 많아요. 문제집 한 쪽을 찍어 보내면
-- "3번 문제 (2)번 아래 식이요" 라고 적는 것보다 훨씬 빨라요.

-- 파일을 담을 곳이에요. 공개하지 않아요.
-- 아무나 주소만 알면 남의 질문 사진을 볼 수 있으면 안 돼요.
-- 꺼낼 때는 Edge Function 이 잠깐 쓰는 주소를 만들어서 줘요.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'thread-images',
  'thread-images',
  false,
  -- 3MB. 폰 사진 한 장이 보통 2~4MB인데, 앱에서 줄여 보내니 이걸로 충분해요.
  -- 크게 잡으면 급식비 아끼는 학교 예산으로 서버값이 나가요.
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 앱 키로는 아무것도 못 해요. 정책을 하나도 안 만들어요.
-- 올리고 내리는 건 전부 Edge Function 이 service_role 로 해요.
-- 쪽지 규칙(누가 무엇을 볼 수 있는지)이 이미 거기 있어서, 사진도 같은 자리에서
-- 판단해야 규칙이 두 군데로 갈라지지 않아요.

-- 메시지 한 줄에 사진을 하나 붙일 수 있어요.
-- 여러 장은 나중에요. 지금은 한 장으로도 충분하고, 목록이 되면
-- 지우기·순서 같은 걸 다 다뤄야 해요.
alter table public.messages add column if not exists image_path text;

-- 사진만 보내는 것도 되게 글자 제한을 풀어요. 대신 둘 다 비면 안 돼요.
alter table public.messages drop constraint if exists messages_text_check;
alter table public.messages add constraint messages_has_content check (
  (length(text) between 1 and 2000) or image_path is not null
);
alter table public.messages alter column text set default '';

notify pgrst, 'reload schema';
