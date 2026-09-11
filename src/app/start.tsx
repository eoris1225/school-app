import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, MAX_WIDTH } from '@/components/ui';
import { THEMES } from '@/constants/themes';
import { SCHOOL, type Role } from '@/data/mock';
import { useApp } from '@/lib/app-state';

export default function StartScreen() {
  const { palette, setRole } = useApp();
  const insets = useSafeAreaInsets();

  const start = (role: Role) => {
    setRole(role);
    router.replace('/');
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.column}>
        <View style={styles.top}>
          <Text style={[styles.school, { color: palette.accentDeep }]}>{SCHOOL.name}</Text>
          <Text style={[styles.title, { color: palette.text }]} accessibilityRole="header">
            학교생활{'\n'}도우미
          </Text>
          <Text style={[styles.desc, { color: palette.sub }]}>
            급식, 시간표, 학교 일정, 선생님께 질문하기까지 한곳에서 확인해요.
          </Text>
          <View style={styles.swatches} accessible accessibilityLabel="고를 수 있는 테마 색상 6가지">
            {THEMES.map((t) => (
              <View key={t.key} style={[styles.swatch, { backgroundColor: t.accent }]} />
            ))}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  top: { marginTop: 40 },
  school: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  title: { fontSize: 48, lineHeight: 56, fontWeight: '800', letterSpacing: -2 },
  desc: { fontSize: 17, lineHeight: 26, marginTop: 16 },
  swatches: { flexDirection: 'row', gap: 10, marginTop: 28 },
  swatch: { width: 22, height: 22, borderRadius: 11 },
  actions: { gap: 12 },
  note: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 4 },
});
