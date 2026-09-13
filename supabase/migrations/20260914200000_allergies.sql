-- 알레르기를 계정에 담아요.
--
-- 지금은 폰 안에만 있어요. 폰을 바꾸면 사라져요. 교시 바꾸기와 가입 안내는
-- 계정에 담게 고쳤는데 알레르기만 빠져 있었어요. 셋 중에 제일 중요한 게
-- 이건데요. 못 먹는 걸 잘못 먹으면 큰일 나요.
--
-- 번호로 담아요. 1번 난류, 2번 우유... 교육부가 정한 번호라 학교가 바뀌어도
-- 같아요. 이름으로 담으면 표기가 조금만 달라도 안 맞아요.
alter table public.profiles
  add column if not exists allergies int[] not null default '{}'::int[];

notify pgrst, 'reload schema';
