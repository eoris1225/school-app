import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Avatar, BackHeader, Button, Chip, Divider, ErrorNote, Field, Loading, Screen, SectionTitle, Segmented, Tag } from '@/components/ui';
import { ThemeSwatches } from '@/components/color-picker';
import { SCHEME_OPTIONS } from '@/constants/themes';
import { ALLERGENS } from '@/data/mock';
import { subjectGroup, TEACHABLE } from '@/lib/subject';
import { ApiError, getSchoolSubjects, promoteToTeacher, setMySubjects } from '@/lib/api';
import { useRemote } from '@/lib/use-remote';
import { addDays, toYmd } from '@/lib/time';
import { useApp } from '@/lib/app-state';
import { ro } from '@/lib/korean';

export default function ProfileScreen() {
  const { palette, role, accent, setAccent, schemePref, setSchemePref, school, me, signOut } = useApp();
  const { allergies, setAllergies, becomeStudent } = useApp();
  const teacher = role === 'teacher';
  // 학생으로 되돌리기는 한 번 더 물어봐요. 담당 과목이 비워지고 쪽지함이 바뀌어요.
  const [dropping, setDropping] = useState(false);
  const [dropFailed, setDropFailed] = useState<string | null>(null);
  const schoolName = school?.name ?? '';
  const myName = me?.name ?? '';

  // 전부 계정과 설정에서 가져와요. 지어낸 값은 한 줄도 없어요.
  const rows: [string, string][] = teacher
    ? [
        ['학교', schoolName],
        // 실제 과목 이름이 있으면 그걸 보여줘요. '외국어'보다 '일본 문화'가 나아요.
        [
          '담당 과목',
          me?.teaches?.length
            ? me.teaches.join(', ')
            : me?.subjects.length
              ? me.subjects.join(', ')
              : '아직 없어요',
        ],
        ['맡은 반', school ? `${school.grade}학년 ${school.cls}반` : '아직 안 골랐어요'],
        ['이름', myName],
      ]
    : [
        ['학교', schoolName],
        ['학년', school ? `${school.grade}학년` : '아직 안 골랐어요'],
        ['반', school ? `${school.cls}반` : '아직 안 골랐어요'],
        ['번호', school?.number ? `${school.number}번` : '아직 안 적었어요'],
        ['이름', myName],
      ];

  const changeSchool = () => router.push('/pick-school');

  /** 학교는 그대로 두고 학년·반·번호만 다시 고르러 가요. */
  const changeClass = () => {
    if (!school) return changeSchool();
    router.push({
      pathname: '/pick-class',
      params: {
        office: school.office,
        officeName: school.officeName,
        code: school.code,
        name: school.name,
      },
    });
  };

  const leave = async () => {
    await signOut();
    router.replace('/start');
  };

  return (
    <Screen bottomInset>
      <BackHeader title="내 정보" />

      <View style={styles.profile}>
        <Avatar size={72} />
        <View style={styles.fill}>
          <Text style={[styles.name, { color: palette.text }]}>{teacher ? `${myName} 선생님` : myName}</Text>
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

      <SectionTitle title="테마 색" />
      <Text style={[styles.help, { color: palette.sub }]}>
        고른 색이 앱 전체에 바로 적용돼요. 원하는 색이 없으면 커스텀 컬러에서 직접 골라요.
      </Text>
      <ThemeSwatches value={accent} onChange={setAccent} custom />

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
            선생님도 다른 학생도 볼 수 없어요. 폰을 바꿔도 따라와요.
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

      <SubjectPicker />

      <SectionTitle title="학교" />
      <Text style={[styles.help, { color: palette.sub }]}>
        {teacher
          ? '맡은 반이 바뀌면 여기서 다시 골라요.'
          : '반이 바뀌었거나 번호를 안 적었으면 여기서 고쳐요. 학교를 옮겼을 때만 아래쪽을 눌러요.'}
      </Text>
      <Button
        label={teacher ? '맡은 반 바꾸기' : '학년·반·번호 바꾸기'}
        icon="next"
        variant="secondary"
        onPress={changeClass}
      />
      <View style={styles.gap} />
      <Button label="다른 학교로 바꾸기" icon="next" variant="secondary" onPress={changeSchool} />

      <SectionTitle title="계정" />

      {/*
        선생님을 다시 학생으로 되돌려요.
        올리는 길만 있고 내리는 길이 없으면, 실수로 코드를 넣었거나 더 이상
        그 학교 선생님이 아닐 때 방법이 없어요.
      */}
      {teacher ? (
        <>
          <Text style={[styles.help, { color: palette.sub }]}>
            학생으로 돌아가면 담당 과목이 비워지고 쪽지함도 사라져요. 선생님 코드를 다시 넣으면
            언제든 되돌릴 수 있어요.
          </Text>
          {dropping ? (
            <View style={[styles.confirm, { backgroundColor: palette.tint }]}>
              <Text style={[styles.confirmText, { color: palette.text }]}>
                학생으로 돌아갈까요? 나를 콕 집어 보낸 쪽지는 그 과목 선생님들께 다시 넘어가요.
              </Text>
              <View style={styles.confirmRow}>
                <View style={styles.fill}>
                  <Button label="아니요" variant="secondary" onPress={() => setDropping(false)} />
                </View>
                <View style={styles.fill}>
                  <Button
                    label="학생으로"
                    onPress={async () => {
                      const problem = await becomeStudent();
                      setDropping(false);
                      setDropFailed(problem);
                    }}
                  />
                </View>
              </View>
            </View>
          ) : (
            <Button
              label="학생으로 돌아가기"
              icon="swap"
              variant="secondary"
              onPress={() => {
                setDropFailed(null);
                setDropping(true);
              }}
            />
          )}
          {dropFailed ? <ErrorNote text={dropFailed} /> : null}
          <View style={styles.gap} />
        </>
      ) : null}

      <Button label="로그아웃" icon="swap" variant="secondary" onPress={leave} />
    </Screen>
  );
}

/**
 * 담당 과목을 고르는 칸이에요. 학생에게는 승급 칸으로, 선생님에게는
 * 바꾸는 칸으로 보여요.
 *
 * 목록을 우리가 박아두지 않아요. 그 학교 시간표에 실제로 있는 과목 이름을
 * 서버에서 받아와요. 학교가 새로 만든 과목도 고를 수 있어야 하니까요.
 * 못 받아오면 교과군 열두 개로 대신해요. 아무것도 못 고르는 것보다 나아요.
 *
 * 고른 이름에서 교과군은 앱이 뽑아요. 쪽지는 교과군으로 오가거든요.
 * '일본 문화'를 고르면 '외국어'로 온 쪽지를 받아요.
 */
function SubjectPicker() {
  const { palette, role, me, school, now, reloadMe } = useApp();
  const teacher = role === 'teacher';

  const [code, setCode] = useState('');
  const [picked, setPicked] = useState<string[]>(me?.teaches?.length ? me.teaches : (me?.subjects ?? []));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 한 주치면 그 학기에 열리는 과목이 거의 다 나와요.
  const to = toYmd(now);
  const from = toYmd(addDays(now, -7));
  // 학생이 코드를 적기 전에는 안 불러요. 쓸데없는 왕복이에요.
  const wantSubjects = teacher || code.trim().length > 0;
  const remote = useRemote(`school-subjects:${school?.code}:${from}:${wantSubjects}`, () =>
    wantSubjects ? getSchoolSubjects(from, to, school ?? undefined) : Promise.resolve([]),
  );
  const options = remote.data?.length ? remote.data : [...TEACHABLE];

  // 고른 이름들이 어느 교과군인지. 쪽지는 이 기준으로 와요.
  const groups = [...new Set(picked.map((s) => subjectGroup(s)))].filter((g) => g !== '기타');

  const save = async () => {
    setBusy(true);
    setFailed(null);
    setDone(false);
    try {
      if (teacher) await setMySubjects(groups, picked);
      else await promoteToTeacher(code.trim(), groups, picked);
      reloadMe();
      setDone(true);
    } catch (e) {
      setFailed(e instanceof ApiError ? e.message : '담당 과목을 저장하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const ready = picked.length > 0 && groups.length > 0 && (teacher || code.trim().length > 0);

  return (
    <>
      <SectionTitle title={teacher ? '담당 과목' : '선생님이신가요?'} />
      <Text style={[styles.help, { color: palette.sub }]}>
        {teacher
          ? '맡은 과목이 바뀌면 여기서 고쳐요. 이 과목으로 온 쪽지를 받아요.'
          : '학교에서 받은 코드를 넣으면 선생님으로 바뀌어요. 코드는 이때 한 번만 쓰고, 그 뒤로는 계정에 역할이 붙어요.'}
      </Text>

      {!teacher ? (
        <Field
          value={code}
          onChangeText={setCode}
          placeholder="선생님 코드"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="선생님 코드"
          style={styles.code}
        />
      ) : null}

      {/*
        과목 고르기는 코드를 넣은 뒤에 보여줘요.
        학생 화면에 담당 과목 칩이 스무 개 넘게 펼쳐져 있으면 "이게 뭐지?"
        싶고, 화면만 길어져요. 학교 과목 목록을 받아오는 것도 학생에게는
        쓸데없는 왕복이라 코드를 적기 전에는 안 불러요.
      */}
      {!teacher && !code.trim() ? null : (
        <>
      <Text style={[styles.help, { color: palette.sub }]}>
        {remote.loading
          ? '우리 학교 과목을 불러오는 중이에요'
          : remote.data?.length
            ? '우리 학교 시간표에 있는 과목이에요. 맡은 것을 전부 골라주세요.'
            : '과목 목록을 못 받아왔어요. 교과군으로 골라주세요.'}
      </Text>

      {remote.loading ? (
        <Loading text="우리 학교 과목을 불러오는 중이에요" rows={2} />
      ) : (
        <View style={styles.subjectRow}>
          {options.map((s) => (
            <Chip
              key={s}
              label={s}
              colored
              selected={picked.includes(s)}
              onPress={() => {
                setDone(false);
                setPicked((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
              }}
            />
          ))}
        </View>
      )}

      {/* 고른 이름이 어느 교과군인지 보여줘요. 쪽지가 어디로 올지 알 수 있게요. */}
      {groups.length ? (
        <Text style={[styles.help, { color: palette.accentDeep }]}>
          {/* 줄을 나누면 사이에 빈칸이 끼어서 '수학 으로'가 돼요. 한 덩어리로 만들어요. */}
          {`${groups.join(', ')}${ro(groups[groups.length - 1])} 온 쪽지를 받아요`}
        </Text>
      ) : null}
        </>
      )}

      {failed ? <ErrorNote text={failed} /> : null}
      {done ? (
        <Text style={[styles.saved, { color: palette.accentDeep }]}>담당 과목을 저장했어요</Text>
      ) : null}

      <Button
        label={busy ? '저장하는 중이에요' : teacher ? '담당 과목 저장하기' : '선생님으로 바꾸기'}
        icon="check"
        variant="secondary"
        disabled={!ready || busy}
        onPress={save}
      />
    </>
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
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  failed: { borderRadius: 16, padding: 16, marginBottom: 12 },
  failedText: { fontSize: 13, lineHeight: 20 },
  code: { borderRadius: 16, height: 52, paddingHorizontal: 16, marginBottom: 12 },
  help: { fontSize: 13, lineHeight: 19, marginTop: -4, marginBottom: 12 },
  saved: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  confirm: { borderRadius: 16, padding: 14, marginBottom: 12, gap: 12 },
  confirmText: { fontSize: 13, fontWeight: '600', lineHeight: 21 },
  confirmRow: { flexDirection: 'row', gap: 8 },
  gap: { height: 8 },
});
