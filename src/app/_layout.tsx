import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FONT_ASSETS } from '@/components/text';
import { AppProvider, useApp } from '@/lib/app-state';

// 글꼴을 다 불러올 때까지 시작 화면을 붙잡아 둬요. (컴포넌트 밖에서 불러야 늦지 않아요)
SplashScreen.preventAutoHideAsync().catch(() => {});

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
        <Stack.Screen name="pick-school" />
        <Stack.Screen name="pick-class" />
        <Stack.Screen name="swap-subject" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);

  useEffect(() => {
    // 글꼴을 못 불러와도 화면은 띄워요. (기본 글꼴로 나와요)
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
