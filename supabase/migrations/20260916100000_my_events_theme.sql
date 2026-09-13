-- 내 일정과 테마를 계정에 담아요.
--
-- 지금까지 이 셋은 기기 저장소(AsyncStorage)에만 있었어요. 그래서 폰을
-- 바꾸거나 앱을 지우면 사라졌어요. 교시 바꾸기와 알레르기는 이미 옮겨뒀는데
-- 이것들만 남아 있었어요.
--
-- 내 일정은 사람이 손으로 적은 거예요. "3월 2일 개학", "치과" 같은 것들요.
-- 다시 적으라고 하기엔 아까워요. 테마는 없어도 큰일은 아니지만, 새 폰에서
-- 로그인했을 때 쓰던 색 그대로 뜨는 게 자기 앱 같잖아요.
--
-- 권한은 따로 안 줘도 돼요. profiles 는 표 단위로 걸려 있어서 칸이 늘어도
-- 그대로 적용돼요. (새 표를 만들 때만 grant 를 챙기면 돼요)
alter table public.profiles
  -- [{ "id": "my-1757...", "date": "2026-09-14", "title": "치과" }, ...]
  --
  -- 표로 안 쪼개고 통째로 담아요. 늘 한 덩어리로 읽고 한 덩어리로 바꿔요.
  -- swaps, teach 와 같은 방식이에요.
  add column if not exists my_events jsonb not null default '[]'::jsonb,

  -- '#f97316' 처럼 색 그 자체예요. 안 고른 계정은 null 이고, 그때는 앱이
  -- 기본 색을 써요. '토마토' 같은 이름을 담으면 목록에 있는 색만 쓸 수
  -- 있게 돼요. (DESIGN.md "테마 색은 이름표 없이 색 그 자체로")
  add column if not exists accent text,

  -- 'system' | 'light' | 'dark'. 안 고른 계정은 null 이에요.
  -- 'system' 을 기본값으로 박아두지 않은 건, "안 골랐다" 와 "시스템을
  -- 따라가기로 골랐다" 가 다른 뜻이기 때문이에요. 기기에만 골라둔 게 있을 때
  -- 그걸 올려보낼지 말지를 이걸로 가려요.
  add column if not exists scheme_pref text;

notify pgrst, 'reload schema';
