import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from '@/lib/app-state';

function RootNavigator() {
  const { palette } = useApp();

  // 화면 밖(리액트 트리 바깥) 바탕색도 같이 바꿔야 어두운 화면에서 흰 테두리가 안 생겨요.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.bg).catch(() => {});
  }, [palette.bg]);

  return (
    <>
      <StatusBar style={palette.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="start" />
        <Stack.Screen name="thread" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="add-event" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
