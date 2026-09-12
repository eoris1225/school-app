import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { SlidingPill, Tap } from '@/components/motion';
import { Text } from '@/components/text';

import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { palette, role, badgeCount } = useApp();
  const { content } = useLayout();
  const [track, setTrack] = useState(0);
  const teacher = role === 'teacher';

  const meta: Record<string, { label: string; icon: IconName }> = {
    index: { label: '홈', icon: 'home' },
    meal: { label: '급식', icon: 'meal' },
    timetable: { label: '시간표', icon: 'timetable' },
    calendar: { label: '달력', icon: 'calendar' },
    community: teacher ? { label: '쪽지함', icon: 'inbox' } : { label: '커뮤니티', icon: 'chat' },
  };

  return (
    <View style={[styles.wrap, { backgroundColor: palette.bg, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View
        style={[styles.bar, { maxWidth: Math.min(content, 640), borderColor: palette.line, backgroundColor: palette.surface }]}>
        {/*
          알약이 움직일 칸 너비는 이 안쪽 줄에서 직접 재요.
          예전에는 바깥 상자 너비에서 12를 빼서 어림했는데, 테두리 1.5와
          안쪽 여백 4를 합치면 11이라 한 픽셀씩 어긋났어요. 재서 쓰면
          여백이나 테두리를 고쳐도 따라와요.
        */}
        <View onLayout={(e) => setTrack(e.nativeEvent.layout.width)} style={styles.inner}>
        <SlidingPill
          index={state.index}
          count={state.routes.length}
          width={track}
          style={{ top: 0, bottom: 0, left: 0, borderRadius: 24, backgroundColor: palette.tint }}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const item = meta[route.name];
          if (!item) return null;
          const color = focused ? palette.accentDeep : palette.sub;
          const showBadge = route.name === 'community' && badgeCount > 0;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <Tap
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={showBadge ? `${item.label}, 새 소식 ${badgeCount}개` : item.label}
              depth={0.06}
              style={styles.item}>
              <View>
                <Icon name={item.icon} size={24} color={color} />
                {showBadge ? (
                  <View style={[styles.badge, { backgroundColor: palette.accent, borderColor: palette.surface }]}>
                    <Text style={[styles.badgeText, { color: palette.onAccent }]}>{badgeCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]}>{item.label}</Text>
            </Tap>
          );
        })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 4 },
  bar: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 30,
    padding: 4,
    width: '100%',
    alignSelf: 'center',
  },
  inner: { flexDirection: 'row', flex: 1 },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 24,
    minHeight: 58,
  },
  label: { fontSize: 12 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
});
