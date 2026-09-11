import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useApp } from '@/lib/app-state';

export default function TabsLayout() {
  const { role, palette, school, authLoading, schoolLoading } = useApp();

  // 로그인 상태를 확인하는 동안은 아무것도 안 보여줘요.
  // 로그인했는데 시작 화면으로 잠깐 튕기면 이상하니까요.
  if (authLoading || schoolLoading) return null;

  // 로그인하지 않았거나 학교를 안 골랐으면 시작 화면으로 보내요.
  if (!role || !school) return <Redirect href="/start" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palette.bg } }}
      tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="meal" />
      <Tabs.Screen name="timetable" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="community" />
    </Tabs>
  );
}
