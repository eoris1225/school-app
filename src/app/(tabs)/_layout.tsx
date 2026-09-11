import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useApp } from '@/lib/app-state';

export default function TabsLayout() {
  const { role, palette } = useApp();
  // 아직 역할을 고르지 않았으면 시작 화면으로 보내요. (나중에 로그인 확인으로 바뀌어요)
  if (!role) return <Redirect href="/start" />;

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
