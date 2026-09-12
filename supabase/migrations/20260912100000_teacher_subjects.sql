-- 선생님이 실제로 맡은 과목 이름을 담아요.
--
-- subjects 칸에는 교과군('수학', '외국어')이 들어가요. 쪽지가 누구에게 갈지
-- 정하는 데 쓰여요. 학생은 교과군으로 질문하니까 그 단위로 맞춰야 해요.
--
-- 그런데 그것만 두면 "일본 문화를 맡고 있어요"를 적을 데가 없어요.
-- 내 정보에 '외국어'라고만 뜨는 것도 아쉽고요. 그래서 실제 이름은 여기 담아요.
--
--   subjects  ['외국어']              쪽지를 받을 기준
--   teaches   ['일본 문화', '한문Ⅰ']   화면에 보여줄 실제 이름
--
-- 목록은 우리가 박아두지 않아요. 그 학교 시간표에 있는 이름을 그대로 받아와요.
-- (Edge Function 의 kind=subjects)
alter table public.profiles add column if not exists teaches text[] not null default '{}';

notify pgrst, 'reload schema';
