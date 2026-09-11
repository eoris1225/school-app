import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { buildPalette, THEMES } from '@/constants/themes';
import { SCHOOL, type Role } from '@/data/mock';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';

export default function StartScreen() {
  const { palette, setRole, scheme, themeKey, setThemeKey } = useApp();
  const insets = useSafeAreaInsets();
  const { content } = useLayout();

  const start = (role: Role) => {
    setRole(role);
    router.replace('/');
  };

  return (
    // 폰을 눕히면 한 화면에 안 들어와서, 그럴 때만 스크롤되게 했어요.
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}>
      <View style={[styles.column, { maxWidth: Math.min(content, 620) }]}>
        <View style={styles.top}>
          <Text style={[styles.school, { color: palette.accentDeep }]}>{SCHOOL.name}</Text>
          <Text style={[styles.title, { color: palette.text }]} accessibilityRole="header">
            학교생활{'\n'}도우미
          </Text>
          <Text style={[styles.desc, { color: palette.sub }]}>
            급식, 시간표, 학교 일정, 선생님께 질문하기까지 한곳에서 확인해요.
          </Text>
          <Text style={[styles.swatchLabel, { color: palette.sub }]}>마음에 드는 색을 골라보세요</Text>
          <View style={styles.swatches} accessibilityRole="radiogroup">
            {THEMES.map((t) => {
              const selected = t.key === themeKey;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setThemeKey(t.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${t.name} 색`}
                  style={({ pressed }) => [
                    styles.swatchWrap,
                    { borderColor: selected ? palette.accent : 'transparent' },
                    pressed && styles.pressed,
                  ]}>
                  <View style={[styles.swatch, { backgroundColor: buildPalette(t.accent, scheme).accent }]} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="학생으로 시작" onPress={() => start('student')} />
          <Button label="선생님으로 시작" variant="secondary" onPress={() => start('teacher')} />
          <Text style={[styles.note, { color: palette.sub }]}>
            지금은 화면 확인용이에요. 나중에 학교 계정 로그인으로 바뀌어요.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  column: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  top: { marginTop: 40 },
  school: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  title: { fontSize: 38, lineHeight: 46, fontWeight: '800', letterSpacing: -2 },
  desc: { fontSize: 15, lineHeight: 23, marginTop: 16 },
  swatchLabel: { fontSize: 13, fontWeight: '600', marginTop: 28 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginLeft: -9 },
  swatchWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 24, height: 24, borderRadius: 12 },
  pressed: { opacity: 0.6 },
  actions: { gap: 12 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
});
