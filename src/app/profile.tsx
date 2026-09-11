import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Avatar, BackHeader, Button, Divider, Screen, SectionTitle, Segmented, Tag } from '@/components/ui';
import { buildPalette, SCHEME_OPTIONS, THEMES } from '@/constants/themes';
import { classLabel, SCHOOL, STUDENT, TEACHER } from '@/data/mock';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';

export default function ProfileScreen() {
  const { palette, role, setRole, themeKey, setThemeKey, scheme, schemePref, setSchemePref, school } =
    useApp();
  const { tablet } = useLayout();
  const teacher = role === 'teacher';
  const [grade, cls] = school ? [String(school.grade), school.cls] : STUDENT.cls.split('-');
  const schoolName = school?.name ?? SCHOOL.name;

  const rows: [string, string][] = teacher
    ? [
        ['학교', schoolName],
        ['담당 과목', TEACHER.subjects.join(', ')],
        ['담임', classLabel(TEACHER.homeroom)],
        ['이름', TEACHER.name],
      ]
    : [
        ['학교', schoolName],
        ['학년', `${grade}학년`],
        ['반', `${cls}반`],
        ['번호', `${STUDENT.number}번`],
        ['이름', STUDENT.name],
      ];

  const changeSchool = () => router.push('/pick-school');

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
            <Text style={[styles.school, { color: palette.sub }]}>{schoolName}</Text>
          </View>
        </View>
      </View>

      <View>
        {rows.map(([k, v], i) => (
          <View key={k}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.infoRow}>
              <Text style={[styles.infoKey, { color: palette.sub }]}>{k}</Text>
              <Text style={[styles.infoValue, { color: palette.text }]}>{v}</Text>
            </View>
          </View>
        ))}
      </View>

      <SectionTitle title="테마 색상" />
      <Text style={[styles.help, { color: palette.sub }]}>고른 색이 앱 전체에 바로 적용돼요.</Text>
      <View style={styles.themeGrid}>
        {THEMES.map((t) => {
          const selected = t.key === themeKey;
          // 지금 밝기에서 실제로 보이게 될 색으로 미리보기를 만들어요.
          const swatch = buildPalette(t.accent, scheme);
          return (
            <Tap
              key={t.key}
              onPress={() => setThemeKey(t.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${t.name} 테마`}
              depth={0.06}
              style={[
                styles.themeTile,
                { width: tablet ? '14%' : '30%' },
                { backgroundColor: selected ? palette.tint : 'transparent' },
              ]}>
              <View style={[styles.swatch, { backgroundColor: swatch.accent }]}>
                {selected ? <Icon name="check" size={22} color={swatch.onAccent} /> : null}
              </View>
              <Text style={[styles.themeName, { color: palette.text, fontWeight: selected ? '800' : '600' }]}>
                {t.name}
              </Text>
            </Tap>
          );
        })}
      </View>

      <SectionTitle title="화면 밝기" />
      <Text style={[styles.help, { color: palette.sub }]}>
        시스템으로 두면 폰 설정을 따라가요. 어두운 곳에서는 어둡게가 눈이 편해요.
      </Text>
      <Segmented value={schemePref} onChange={setSchemePref} options={SCHEME_OPTIONS} />

      <SectionTitle title="학교" />
      <Text style={[styles.help, { color: palette.sub }]}>
        학교나 반이 바뀌면 여기서 다시 골라요. 급식과 시간표가 그 학교 것으로 바뀌어요.
      </Text>
      <Button label="학교·반 바꾸기" icon="next" variant="secondary" onPress={changeSchool} />

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
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  school: { fontSize: 13, fontWeight: '600' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoKey: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '800' },

  help: { fontSize: 13, lineHeight: 19, marginTop: -4, marginBottom: 12 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  themeTile: {
    flexGrow: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
  },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  themeName: { fontSize: 13 },
});
