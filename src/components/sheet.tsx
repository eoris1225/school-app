import { useEffect } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';

/*
 * 화면 위에 뜨는 팝업이에요.
 *
 * 로그인처럼 "잠깐 하고 돌아올 일"은 화면을 통째로 갈아끼우는 것보다
 * 위에 띄우는 게 나아요. 뒤에 뭐가 있었는지 안 사라지고, 닫으면 바로
 * 원래 자리예요.
 *
 * 폰에서는 아래에서 올라오고, 화면이 넓으면 가운데 뜨는 창이 돼요.
 * 좁은 화면에서 가운데 창을 띄우면 자판이 올라왔을 때 갈 곳이 없어요.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { palette } = useApp();
  const { tablet } = useLayout();
  const insets = useSafeAreaInsets();
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = visible
      ? withSpring(1, { damping: 20, stiffness: 220, mass: 0.8 })
      : withTiming(0, { duration: 160 });
  }, [visible, shown]);

  const dim = useAnimatedStyle(() => ({ opacity: shown.value }));
  const card = useAnimatedStyle(() => ({
    opacity: Math.min(shown.value * 1.4, 1),
    transform: [
      { translateY: (1 - shown.value) * (tablet ? 16 : 40) },
      { scale: tablet ? 0.96 + shown.value * 0.04 : 1 },
    ],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/*
        팝업 안에도 GestureHandlerRootView 를 또 깔아요.

        Modal 은 안드로이드에서 딴 창으로 떠요. 리액트 트리로는 앱 안에
        있지만 화면으로는 바깥이라, 앱 맨 바깥에 깐 건 여기까지 안 와요.
        이게 없으면 팝업 안에서 미는 동작이 통째로 죽어요.
      */}
      <GestureHandlerRootView style={[styles.root, tablet ? styles.center : styles.bottom]}>
        {/* 바깥을 누르면 닫혀요. 화면 읽어주는 기능에도 알려줘요. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
          style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dim]} />
        </Pressable>

        <Animated.View
          style={[
            styles.card,
            tablet ? styles.cardWide : [styles.cardPhone, { paddingBottom: insets.bottom + 24 }],
            { backgroundColor: palette.surface, borderColor: palette.line },
            card,
          ]}>
          {/* 폰에서는 위에 손잡이를 그려요. 아래로 내려서 닫는다는 표시예요. */}
          {!tablet ? <View style={[styles.grip, { backgroundColor: palette.line }]} /> : null}

          <View style={styles.head}>
            <Text style={[styles.title, { color: palette.text }]} accessibilityRole="header">
              {title}
            </Text>
            <Tap
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="닫기"
              hitSlop={8}
              depth={0.1}
              style={[styles.close, { backgroundColor: palette.tint }]}>
              <Icon name="close" size={18} color={palette.sub} />
            </Tap>
          </View>

          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  bottom: { justifyContent: 'flex-end' },
  dim: { backgroundColor: 'rgba(0,0,0,0.45)' },

  card: {
    width: '100%',
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      // 웹에서는 그림자가 그대로 보여요. 폰은 elevation으로 대신해요.
      default: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
    }),
  },
  cardPhone: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  cardWide: { maxWidth: 440, borderRadius: 28 },

  grip: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
