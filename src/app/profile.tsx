import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Avatar, BackHeader, Button, Card, Divider, Screen, SectionTitle, Segmented, Tag } from '@/components/ui';
import { buildPalette, SCHEME_OPTIONS, THEMES } from '@/constants/themes';
import { classLabel, SCHOOL, STUDENT, TEACHER } from '@/data/mock';
import { useApp } from '@/lib/app-state';

export default function ProfileScreen() {
  const { palette, role, setRole, themeKey, setThemeKey, scheme, schemePref, setSchemePref } = useApp();
  const teacher = role === 'teacher';
  const [grade, cls] = STUDENT.cls.split('-');

  const rows: [string, string][] = teacher
    ? [
        ['학교', SCHOOL.name],
        ['담당 과목', TEACHER.subjects.join(', ')],
        ['담임', classLabel(TEACHER.homeroom)],
        ['이름', TEACHER.name],
      ]
    : [
        ['학교', SCHOOL.name],
        ['학년', `${grade}학년`],
        ['반', `${cls}반`],
        ['번호', `${STUDENT.number}번`],
        ['이름', STUDENT.name],
      ];

  const switchRole = () => {
    setRole(teacher ? 'student' : 'teacher');
    router.replace('/');
  };

  return (
    <Screen bottomInset>
      <BackHeader title="내 정보" />

      <View style={styles.profile}>
        <Avatar size={72} />
        <View style={styles.fill}>
          <Text style={[styles.name, { color: palette.text }]}>{teacher ? `${TEACHER.name} 선생님` : STUDENT.name}</Text>
          <View style={styles.roleRow}>
            <Tag label={teacher ? '관리자' : '학생'} tone={teacher ? 'solid' : 'soft'} />
            <Text style={[styles.school, { color: palette.sub }]}>{SCHOOL.name}</Text>
          </View>
        </View>
      </View>

      <Card style={styles.infoCard}>
        {rows.map(([k, v], i) => (
          <View key={k}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.infoRow}>
              <Text style={[styles.infoKey, { color: palette.sub }]}>{k}</Text>
              <Text style={[styles.infoValue, { color: palette.text }]}>{v}</Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionTitle title="테마 색상" />
      <Text style={[styles.help, { color: palette.sub }]}>고른 색이 앱 전체에 바로 적용돼요.</Text>
      <View style={styles.themeGrid}>
        {THEMES.map((t) => {
          const selected = t.key === themeKey;
          // 지금 밝기에서 실제로 보이게 될 색으로 미리보기를 만들어요.
          const swatch = buildPalette(t.accent, scheme);
          return (
            <Pressable
              key={t.key}
              onPress={() => setThemeKey(t.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${t.name} 테마`}
              style={({ pressed }) => [
                styles.themeTile,
                { borderColor: selected ? palette.accent : palette.line, borderWidth: selected ? 2.5 : 1.5 },
                pressed && { opacity: 0.6 },
              ]}>
              <View style={[styles.swatch, { backgroundColor: swatch.accent }]}>
                {selected ? <Icon name="check" size={22} color={swatch.onAccent} /> : null}
              </View>
              <Text style={[styles.themeName, { color: palette.text, fontWeight: selected ? '800' : '600' }]}>
                {t.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title="화면 밝기" />
      <Text style={[styles.help, { color: palette.sub }]}>
        시스템으로 두면 폰 설정을 따라가요. 어두운 곳에서는 어둡게가 눈이 편해요.
      </Text>
      <Segmented value={schemePref} onChange={setSchemePref} options={SCHEME_OPTIONS} />

      <SectionTitle title="화면 미리보기" />
      <Text style={[styles.help, { color: palette.sub }]}>
        지금은 화면 확인용이라 역할을 바로 바꿀 수 있어요. 나중에는 로그인한 계정에 따라 정해져요.
      </Text>
      <Button
        label={teacher ? '학생 화면으로 보기' : '선생님 화면으로 보기'}
        icon="swap"
        variant="secondary"
        onPress={switchRole}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  name: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  school: { fontSize: 15, fontWeight: '600' },

  infoCard: { paddingVertical: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  infoKey: { fontSize: 16, fontWeight: '600' },
  infoValue: { fontSize: 16, fontWeight: '800' },

  help: { fontSize: 15, lineHeight: 21, marginTop: -4, marginBottom: 12 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  themeTile: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
  },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  themeName: { fontSize: 16 },
});
