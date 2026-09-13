-- "답변완료"를 선생님이 직접 누르게 해요.
--
-- 지금까지는 선생님 답이 한 줄이라도 있으면 완료로 봤어요. 계산으로 정한
-- 거라 칸이 따로 없었고요. 그런데 그게 실제와 안 맞아요.
--
--   "잠깐만요, 찾아보고 알려줄게요" 도 답이에요 -> 완료로 넘어가버려요
--   학생이 "그럼 이건요?" 하고 더 물어봐도 -> 완료인 채로 남아요
--
-- 끝났는지는 선생님만 알아요. 그러니 선생님이 누르는 게 맞아요.
alter table public.threads
  -- null 이면 답변대기예요. 시각이 적혀 있으면 완료고요.
  -- true/false 대신 시각으로 담는 건, 언제 끝났는지도 알 수 있어서예요.
  add column if not exists answered_at timestamptz,
  -- 누가 눌렀는지. 한 과목에 선생님이 여럿이라 학생에게 알려주려고요.
  add column if not exists answered_by_name text;

-- 대기 목록을 훑을 때 써요. 선생님이 제일 자주 여는 화면이에요.
create index if not exists threads_answered_idx on public.threads (answered_at);

/*
 * 이미 있던 쪽지를 옮겨요.
 *
 * 안 옮기면 예전 쪽지가 전부 "답변대기"로 되살아나요. 답이 다 끝난 것까지
 * 선생님 대기 목록에 우르르 올라오는 거예요. 예전 규칙 그대로, 선생님 답이
 * 있으면 완료로 보고 그 답을 쓴 시각을 적어둬요.
 */
update public.threads t
set answered_at = m.at
from (
  select thread_id, max(created_at) as at
  from public.messages
  where author_role = 'teacher'
  group by thread_id
) m
where m.thread_id = t.id and t.answered_at is null;

notify pgrst, 'reload schema';
