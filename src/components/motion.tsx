import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** 눌렀다 뗐을 때 통통 돌아오는 느낌 */
const SPRING = { damping: 15, stiffness: 280, mass: 0.6 } as const;

export function press(v: SharedValue<number>) {
  'worklet';
  v.value = withTiming(1, { duration: 90 });
}

export function release(v: SharedValue<number>) {
  'worklet';
  v.value = withSpring(0, SPRING);
}

/** 폰에서만 아주 약하게 진동해요. 웹에서는 아무 일도 안 일어나요. */
function tick() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export type TapProps = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 얼마나 눌릴지. 큰 카드는 덜, 작은 버튼은 더 눌러요. */
  depth?: number;
  /** 누를 때 진동을 줄지 */
  haptic?: boolean;
};

/**
 * 누르면 살짝 작아졌다가 스프링으로 돌아오는 버튼이에요.
 * 밋밋하게 흐려지는 것보다 훨씬 손맛이 좋아요.
 */
export function Tap({ children, style, depth = 0.03, haptic = true, onPressIn, onPressOut, ...props }: TapProps) {
  const p = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - p.value * depth }],
    opacity: 1 - p.value * 0.1,
  }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        press(p);
        if (haptic) tick();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        release(p);
        onPressOut?.(e);
      }}
      style={[style, anim]}>
      {children}
    </AnimatedPressable>
  );
}

/**
 * 화면에 뜰 때 아래에서 살짝 올라오며 나타나요.
 * delay를 조금씩 다르게 주면 순서대로 올라와서 보기 좋아요.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 14,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withDelay(delay, withTiming(1, { duration: 420 }));
  }, [delay, shown]);

  const anim = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * distance }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** 선택 표시가 미끄러지듯 옮겨 다니는 알약 */
export function SlidingPill({
  index,
  count,
  width,
  style,
}: {
  index: number;
  count: number;
  width: number;
  style?: StyleProp<ViewStyle>;
}) {
  const slot = width / Math.max(count, 1);
  const x = useSharedValue(index * slot);

  useEffect(() => {
    x.value = withSpring(index * slot, { damping: 18, stiffness: 200, mass: 0.7 });
  }, [index, slot, x]);

  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  if (!width) return null;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: slot }, style, anim]} />;
}
