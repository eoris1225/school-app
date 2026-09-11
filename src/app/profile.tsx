import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Avatar, BackHeader, Button, Divider, Field, Screen, SectionTitle, Segmented, Tag } from '@/components/ui';
import { buildPalette, SCHEME_OPTIONS, THEMES } from '@/constants/themes';
import { ALLERGENS, classLabel, SCHOOL, STUDENT, TEACHER } from '@/data/mock';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';

export default function ProfileScreen() {
  const { palette, role, setRole, themeKey, setThemeKey, scheme, schemePref, setSchemePref, school } =
    useApp();
  const { teacherCode, setTeacherCode, allergies, setAllergies } = useApp();
  const [codeDraft, setCodeDraft] = useState(teacherCode);
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

      {!teacher ? (
        <>
          <SectionTitle title="알레르기" value={allergies.length ? `${allergies.length}개` : undefined} />
          <Text style={[styles.help, { color: palette.sub }]}>
            못 먹는 재료를 골라두면 급식에서 그 메뉴를 눈에 띄게 표시해줘요.
            이 기기에만 담기고 아무에게도 보이지 않아요.
          </Text>
          <View style={styles.allergyGrid}>
            {ALLERGENS.map((name, i) => {
              const n = i + 1;
              const on = allergies.includes(n);
              return (
                <Tap
                  key={name}
                  onPress={() =>
                    setAllergies(on ? allergies.filter((x) => x !== n) : [...allergies, n])
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={name}
                  depth={0.04}
                  style={[
                    styles.allergyChip,
                    { backgroundColor: on ? palette.accent : palette.tint },
                  ]}>
                  <Text numeric style={[styles.allergyNum, { color: on ? palette.onAccent : palette.sub }]}>
                    {n}
                  </Text>
                  <Text style={[styles.allergyName, { color: on ? palette.onAccent : palette.text }]}>
                    {name}
                  </Text>
                </Tap>
              );
            })}
          </View>
          {allergies.length ? (
            <Text style={[styles.help, { color: palette.sub }]}>
              급식 정보는 학교가 올린 그대로예요. 표시가 없어도 조리 과정에서 섞일 수
              있으니, 심한 알레르기가 있으면 꼭 직접 확인해주세요.
            </Text>
          ) : null}
        </>
      ) : null}

      {teacher ? (
        <>
          <SectionTitle title="선생님 코드" />
          <Text style={[styles.help, { color: palette.sub }]}>
            수행평가를 등록하거나 지울 때 필요해요. 학교에서 정한 코드를 넣어주세요.
            이 기기에만 담기고 어디에도 올라가지 않아요.
          </Text>
          <Field
            value={codeDraft}
            onChangeText={setCodeDraft}
            onBlur={() => setTeacherCode(codeDraft)}
            placeholder="영문과 숫자로 된 코드"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="선생님 코드"
            style={styles.code}
          />
          <Button
            label={codeDraft.trim() === teacherCode && teacherCode ? '저장됐어요' : '코드 저장'}
            icon="check"
            variant="secondary"
            disabled={codeDraft.trim() === teacherCode}
            onPress={() => setTeacherCode(codeDraft)}
          />
        </>
      ) : null}

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

  allergyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  allergyNum: { fontSize: 12, fontWeight: '800' },
  allergyName: { fontSize: 13, fontWeight: '600' },
  code: { borderRadius: 16, height: 52, paddingHorizontal: 16, marginBottom: 12 },
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
