-- 고칠 권한을 줘요.
--
-- 표를 만들 때 select, insert, delete 만 줬어요. 그때는 고치는 기능이 없어서
-- update 를 안 줬거든요. 이제 선생님이 올린 일정을 고칠 수 있게 됐는데, 권한이
-- 없으니 표가 403으로 거절해요. 올리기와 지우기는 되는데 고치기만 안 되는
-- 이상한 모양이었어요.
--
-- service_role 에게만 줘요. 그 키는 Edge Function 안에만 있어요. anon 에게는
-- 안 줘요. 그건 앱에 박혀서 누구나 볼 수 있는 키라, 주면 아무나 남의 수행평가를
-- 고칠 수 있게 돼요. 누가 고칠 수 있는지는 함수 안에서 가려요.
grant update on public.assessments to service_role;

notify pgrst, 'reload schema';
