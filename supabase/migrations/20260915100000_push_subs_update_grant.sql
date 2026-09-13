-- 받을 곳을 덮어쓸 권한을 줘요.
--
-- 표를 만들 때 select, insert, delete 만 줬어요. 그런데 같은 기기가 다시
-- 켜면 같은 주소가 또 와요. 그때 새 줄을 만들면 알림이 두 번 가니까 덮어써요.
-- 덮어쓰기는 속으로 UPDATE 를 해요. 권한이 없어서 500이 났어요.
--
-- 수행평가 때와 똑같은 실수예요. 표를 만들 때 "지금 쓰는 것"만 주고, 나중에
-- 늘어난 쓰임을 안 챙겼어요. 표에 쓰기를 더하면 권한도 같이 봐야 해요.
grant update on public.push_subs to service_role;

notify pgrst, 'reload schema';
