-- 일정에 자세한 내용을 달 수 있게 해요.
--
-- 여태 제목 한 줄이 전부였어요. "수학 수행평가" 만 보고는 뭘 챙겨야 하는지
-- 알 수가 없어요. 선생님이 준비물이나 범위를 적어두면 학생이 일정을 눌러서
-- 볼 수 있게 해요.
--
-- 안 적어도 돼요. 대부분은 제목만으로 충분하거든요. 그래서 not null 을
-- 안 걸었어요. 예전에 등록된 일정도 그대로 남아요.
alter table public.assessments
  add column if not exists detail text;

-- 너무 길면 화면에서 감당이 안 돼요. 쪽지(2000자)보다 짧게 잡았어요.
-- 준비물 안내지 편지가 아니니까요.
alter table public.assessments
  drop constraint if exists assessments_detail_len;
alter table public.assessments
  add constraint assessments_detail_len
  check (detail is null or char_length(detail) <= 500);

notify pgrst, 'reload schema';
