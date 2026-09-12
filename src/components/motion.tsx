import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
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

/**
 * 하나씩 톡 하고 나타나요. 아이콘 여러 개를 나란히 놓을 때 써요.
 *
 * Reveal은 덩어리째 올라오는데, 아이콘은 하나씩 순서대로 커지면서 나오는
 * 게 훨씬 살아 있어 보여요. 커지는 폭은 아주 작게(0.86 -> 1) 잡았어요.
 * 크게 잡으면 통통 튀는 느낌이 나는데 그건 안 쓰기로 했어요.
 */
export function Pop({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withDelay(delay, withSpring(1, { damping: 16, stiffness: 220, mass: 0.7 }));
  }, [delay, shown]);

  const anim = useAnimatedStyle(() => ({
    opacity: Math.min(shown.value * 1.6, 1),
    transform: [{ scale: 0.86 + shown.value * 0.14 }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/**
 * 내용이 아직 안 왔을 때 자리만 잡아두고 은은하게 밝아졌다 어두워져요.
 *
 * 빙글빙글 도는 동그라미보다 이게 나아요. 글이 들어올 자리와 크기를 미리
 * 보여주니까 화면이 덜 덜컹거리고, 얼마나 올지도 짐작이 돼요.
 */
export function Shimmer({
  width,
  height = 14,
  radius = 7,
  delay = 0,
  color,
  style,
}: {
  width: number | `${number}%`;
  height?: number;
  radius?: number;
  delay?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const glow = useSharedValue(0.5);

  useEffect(() => {
    glow.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [delay, glow]);

  const anim = useAnimatedStyle(() => ({ opacity: 0.35 + glow.value * 0.4 }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: color }, style, anim]}
    />
  );
}

/**
 * 숫자가 바뀔 때 살짝 커졌다 돌아와요. 안 읽은 쪽지 개수처럼
 * "방금 늘었다"를 알려줘야 하는 자리에 써요.
 */
export function Bump({ value, children, style }: { value: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(1);

  useEffect(() => {
    s.value = withSequence(withTiming(1.18, { duration: 140 }), withSpring(1, SPRING));
  }, [value, s]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
