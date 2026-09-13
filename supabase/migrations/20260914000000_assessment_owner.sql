-- 일정을 누가 올렸는지 적어둬요.
--
-- 지금은 이 칸이 없어요. 그래서 서버가 "이건 네 것이 아니야"를 말할 수가
-- 없어요. 앱에서는 내 과목이 아니면 지우기 버튼을 감추는데, 그건 화면에서만
-- 감추는 거예요. 같은 학교 선생님이면 주소로 직접 불러서 남의 수행평가를
-- 지울 수 있어요. 막으려면 주인을 알아야 해요.
--
-- 덤으로 두 가지가 같이 풀려요.
--   1. 선생님이 "내가 올린 일정"만 골라 볼 수 있어요. 지금은 학교 전체
--      일정에 섞여 있어서 자기가 뭘 올렸는지 찾을 수가 없어요.
--   2. 학생도 누가 낸 수행평가인지 알 수 있어요.
--
-- 이름을 따로 담는 이유는 쪽지와 같아요. 선생님이 나중에 계정을 지워도
-- "누가 올렸더라"가 남아 있어야 해요. 그때 id는 비워지고 이름만 남아요.
alter table public.assessments
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.assessments
  add column if not exists created_by_name text;

-- "내가 올린 것"을 찾는 데 써요. 주인이 없는 예전 줄은 뺄 필요가 없어서
-- 통째로 걸어요.
create index if not exists assessments_owner_idx
  on public.assessments (school_office, school_code, created_by);

notify pgrst, 'reload schema';
