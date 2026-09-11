import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';

import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { palette, role, badgeCount } = useApp();
  const { content } = useLayout();
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
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={showBadge ? `${item.label}, 새 소식 ${badgeCount}개` : item.label}
              style={[styles.item, focused && { backgroundColor: palette.tint }]}>
              <View>
                <Icon name={item.icon} size={24} color={color} />
                {showBadge ? (
                  <View style={[styles.badge, { backgroundColor: palette.accent, borderColor: palette.surface }]}>
                    <Text style={[styles.badgeText, { color: palette.onAccent }]}>{badgeCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, { color, fontWeight: focused ? '800' : '600' }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 6 },
  bar: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 30,
    padding: 6,
    width: '100%',
    alignSelf: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    borderRadius: 24,
    minHeight: 58,
  },
  label: { fontSize: 11 },
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
  badgeText: { fontSize: 11, fontWeight: '800' },
});
