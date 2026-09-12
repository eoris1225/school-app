import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FONT_ASSETS } from '@/components/text';
import { AppProvider, useApp } from '@/lib/app-state';

// 글꼴을 다 불러올 때까지 시작 화면을 붙잡아 둬요. (컴포넌트 밖에서 불러야 늦지 않아요)
SplashScreen.preventAutoHideAsync().catch(() => {});

/*
 * 밝기를 바꿀 때 화면을 덮는 막이에요.
 *
 * 왜 색을 천천히 못 바꾸고 이렇게 가리는지는 app-state.tsx의 schemeSwap
 * 쪽에 적어뒀어요. 화면 맨 위에 깔리지만 손가락은 통과해요.
 *
 * 한 개의 effect가 두 단계를 다 맡아요. 지금 밝기가 아직 목표와 다르면
 * 덮는 중이고, 같아지면 걷는 중이에요. 밝기가 바뀌면 effect가 다시 돌면서
 * 저절로 다음 단계로 넘어가요. 단계를 따로 저장해두지 않아서 어긋날 일이 없어요.
 */
function SchemeFade() {
  const { schemeSwap, commitScheme, endScheme, scheme } = useApp();
  const cover = useSharedValue(0);

  useEffect(() => {
    if (!schemeSwap) return;
    if (scheme !== schemeSwap.to) {
      // 1단계: 덮어요. 다 덮이면 그 밑에서 색을 갈아요.
      cover.value = withTiming(1, { duration: 150 }, (done) => {
        if (done) runOnJS(commitScheme)();
      });
      return;
    }
    /*
     * 2단계: 갈렸으니 걷어요.
     *
     * 따로 틈을 주지 않아요. 이 effect는 새 색으로 다시 그린 뒤에 도는 거라
     * 이미 준비가 끝나 있어요. 오히려 색을 갈 때 화면 전체를 다시 그리느라
     * 저절로 100ms쯤 걸려요. 거기에 더 얹으면 빈 화면만 길어져요.
     */
    cover.value = withTiming(0, { duration: 240 }, (done) => {
      if (done) runOnJS(endScheme)();
    });
  }, [schemeSwap, scheme, commitScheme, endScheme, cover]);

  const anim = useAnimatedStyle(() => ({ opacity: cover.value }));
  // 바뀌는 중이 아니면 아예 안 그려요.
  if (!schemeSwap) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: schemeSwap.color }, anim]}
    />
  );
}

function RootNavigator() {
  const { palette } = useApp();

  // 화면 밖(리액트 트리 바깥) 바탕색도 같이 바꿔야 어두운 화면에서 흰 테두리가 안 생겨요.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.bg).catch(() => {});
  }, [palette.bg]);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <StatusBar style={palette.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="start" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="thread" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="add-event" />
        <Stack.Screen name="pick-school" />
        <Stack.Screen name="pick-class" />
        <Stack.Screen name="swap-subject" />
      </Stack>
      {/* 막은 맨 마지막에 둬요. 탭 바까지 덮어야 하니까요. */}
      <SchemeFade />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

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
