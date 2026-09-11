-- 표에 접근 권한을 줘요.
--
-- 프로젝트를 만들 때 "Automatically expose new tables" 를 꺼뒀어요.
-- 실수로 만든 표가 인터넷에 열리지 않게 하려고요. 대신 새 표에는 권한이
-- 자동으로 안 붙어서, 우리 함수도 못 읽어요. 그래서 여기서 직접 줘요.
--
-- service_role 에게만 줘요. 그 키는 Edge Function 안에만 있어요.
-- anon 에게는 주지 않아요. 그건 앱에 박혀서 누구나 볼 수 있는 키라서,
-- 권한을 주면 아무나 수행평가를 고칠 수 있게 돼요.

grant usage on schema public to service_role;
grant select, insert, delete on public.assessments to service_role;

-- 권한을 바꾸면 Data API가 다시 읽게 해줘야 바로 반영돼요.
notify pgrst, 'reload schema';
