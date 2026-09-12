-- 쪽지를 한 선생님께만 보낼 수 있게 해요.
--
-- 여태 과목만 고르면 그 학교 그 과목 선생님 전부에게 갔어요. 과목 선생님이
-- 한 분인 학교는 괜찮지만, 수학 선생님이 여섯 분인 학교에서는 내 담임께
-- 물어보고 싶어도 방법이 없었어요. 반대로 선생님 쪽에서는 자기 반 학생도
-- 아닌 질문까지 전부 쌓여요.
--
-- teacher_id 가 비어 있으면 예전처럼 그 과목 선생님 모두에게 가요.
-- 학교에 그 과목 선생님 계정이 아직 없을 때가 그래요. 채워져 있으면
-- 그 한 분과 보낸 학생만 볼 수 있어요.
--
-- 계정이 지워지면 비워요(set null). 지우면서 쪽지까지 같이 날리면 학생이
-- 보낸 질문과 받은 답이 통째로 사라져요. 선생님이 학교를 옮긴 것뿐인데요.
-- 비워두면 그 과목 선생님들께 다시 보이니까 이어받을 수 있어요.
alter table public.threads
  add column if not exists teacher_id uuid references auth.users (id) on delete set null;

-- 이름은 보낼 때 한 번 박아둬요. 학생 이름을 박아두는 것과 같은 이유예요.
-- 계정이 지워져도 "누구에게 보냈는지"는 남아 있어야 해요.
alter table public.threads
  add column if not exists teacher_name text;

-- 선생님 쪽지함은 "우리 학교 + 내 담당 과목" 에 "나에게 온 것 또는 지정 없는 것"
-- 을 더해서 찾아요. 지정된 쪽지를 빨리 찾으려고 색인을 하나 둬요.
create index if not exists threads_for_named_teacher
  on public.threads (teacher_id, updated_at desc)
  where teacher_id is not null;

notify pgrst, 'reload schema';
