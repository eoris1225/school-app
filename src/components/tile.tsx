import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { fitIcon, Icon, type IconName } from '@/components/icon';
import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { mix } from '@/constants/themes';
import { SOLID, type ToneKey } from '@/constants/tones';
import { useApp } from '@/lib/app-state';

/**
 * 앱 아이콘처럼 보이는 색 타일이에요.
 * 그라데이션 + 위쪽 하이라이트 + 색 그림자를 겹쳐서 입체감을 흉내내요.
 * 테두리 있는 카드 대신 이걸 쓰면 화면이 네모 창으로만 안 보여요.
 */
export function Tile({
  icon,
  tone,
  label,
  onPress,
  badge,
  size = 58,
}: {
  icon: IconName;
  tone: ToneKey;
  label: string;
  onPress: () => void;
  /** 오른쪽 위 빨간 숫자 */
  badge?: number;
  size?: number;
}) {
  const { palette } = useApp();
  const base = SOLID[tone];
  const light = mix(base, '#FFFFFF', 0.3);
  const deep = mix(base, '#000000', 0.14);

  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, 새 소식 ${badge}개` : label}
      depth={0.08}
      style={styles.wrap}>
      <View style={[styles.shadow, { width: size, height: size, borderRadius: size * 0.3, shadowColor: base }]}>
        <LinearGradient
          colors={[light, base, deep]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3 }]}>
          {/* 위쪽에 살짝 밝은 면을 얹어 유리 같은 광택을 흉내내요. */}
          <View style={[styles.gloss, { borderRadius: size * 0.3, height: size * 0.46 }]} />
          <Icon name={icon} size={fitIcon(size, 0.46)} color="#FFFFFF" />
        </LinearGradient>
        {badge ? (
          <View style={[styles.badge, { borderColor: palette.bg }]}>
            <Text numeric style={styles.badgeText}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 74, alignItems: 'center', gap: 8 },
  shadow: { shadowOpacity: 0.34, shadowRadius: 11, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    opacity: 0.18,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 4,
    backgroundColor: '#E5484D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  label: { fontSize: 13, fontWeight: '600' },
});
