import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { Pop, Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Button, Empty, Field, Loading, Screen } from '@/components/ui';
import { WeekGrid } from '@/components/week-grid';
import { ALLERGENS, WEEKDAYS } from '@/data/mock';
import { getLessons, saveMySettings } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { saveSetupSeen } from '@/lib/my-settings';
import { currentPeriod, weekDates, weekdayOf } from '@/lib/time';
import { byWeekday, sameNameSlots, withSwaps } from '@/lib/timetable';
import { useRemote } from '@/lib/use-remote';

/*
 * 가입하고 나서 한 번 지나가는 설정이에요.
 *
 * 학교와 학년·반은 앱이 돌아가려면 꼭 있어야 해서 이미 받았어요.
 * 여기서는 있으면 좋은 것들을 하나씩 물어봐요.
 *
 * 모든 칸에 "다음에 하기"가 있어요. 이런 걸 귀찮아하는 사람이 있고,
 * 그 사람도 앱은 멀쩡히 써야 해요. 넘긴 건 내 정보에서 언제든 할 수 있어요.
 * 한 번 지나가면 다시 안 물어봐요. 건너뛰었어도요.
 */

type Step = 'number' | 'allergy' | 'subjects';
const STEPS: Step[] = ['number', 'allergy', 'subjects'];

export default function SetupScreen() {
  const { palette, school, setSchool, me } = useApp();
  const [at, setAt] = useState(0);
  const step = STEPS[at];

  const done = () => {
    void saveSetupSeen();
    // 계정에도 적어요. 다른 기기에서 로그인해도 다시 안 물어봐요.
    if (me) saveMySettings({ setupSeen: true }).catch(() => {});
    router.replace('/');
  };

  const next = () => (at < STEPS.length - 1 ? setAt(at + 1) : done());

  return (
    <Screen bottomInset>
      {/* 어디까지 왔는지. 몇 개 남았는지 보여야 끝까지 할 마음이 생겨요. */}
      <View style={styles.dots}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.dot,
              { backgroundColor: i <= at ? palette.accent : palette.line },
              i === at && styles.dotNow,
            ]}
          />
        ))}
        <View style={styles.fill} />
        <Tap
          onPress={done}
          accessibilityRole="button"
          accessibilityLabel="설정 건너뛰고 시작하기"
          hitSlop={10}
          depth={0.05}>
          <Text style={[styles.skipAll, { color: palette.sub }]}>건너뛰기</Text>
        </Tap>
      </View>

      {step === 'number' ? (
        <NumberStep
          value={school?.number}
          onSave={(n) => {
            if (school) setSchool({ ...school, number: n });
            next();
          }}
          onSkip={next}
        />
      ) : null}
      {step === 'allergy' ? <AllergyStep onNext={next} /> : null}
      {step === 'subjects' ? <SubjectStep onNext={next} /> : null}
    </Screen>
  );
}

/** 한 칸의 겉모양. 그림, 제목, 설명, 내용, 그리고 두 버튼이에요. */
function Card({
  art,
  title,
  body,
  children,
  nextLabel,
  onNext,
  onSkip,
  ready = true,
}: {
  art: 'pin' | 'warn' | 'timetable';
  title: string;
  body: string;
  children?: React.ReactNode;
  nextLabel: string;
  onNext: () => void;
  onSkip: () => void;
  ready?: boolean;
}) {
  const { palette } = useApp();
  return (
    <>
      <Pop style={[styles.art, { backgroundColor: palette.tint }]}>
        <Emoji name={art} size={44} tone={art === 'warn' ? 'color' : 'mono'} />
      </Pop>
      <Text style={[styles.title, { color: palette.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[styles.body, { color: palette.sub }]}>{body}</Text>

      <View style={styles.content}>{children}</View>

      <View style={styles.actions}>
        <Button label={nextLabel} disabled={!ready} onPress={onNext} />
        <Tap
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="다음에 하기"
          depth={0.04}
          style={styles.skip}>
          <Text style={[styles.skipText, { color: palette.sub }]}>다음에 하기</Text>
        </Tap>
      </View>
    </>
  );
}

function NumberStep({
  value,
  onSave,
  onSkip,
}: {
  value?: number;
  onSave: (n: number) => void;
  onSkip: () => void;
}) {
  const [text, setText] = useState(value ? String(value) : '');
  const n = Number(text.trim());
  const ok = !!text.trim() && Number.isInteger(n) && n > 0 && n <= 100;

  return (
    <Card
      art="pin"
      title="출석 번호가 몇 번이에요?"
      body="내 정보에 보여주려고 받아요. 선생님께 쪽지를 보낼 때도 같이 가서, 누가 보냈는지 바로 알 수 있어요."
      nextLabel={ok ? `${n}번으로 저장하기` : '번호를 적어주세요'}
      ready={ok}
      onNext={() => onSave(n)}
      onSkip={onSkip}>
      <Field
        value={text}
        onChangeText={setText}
        placeholder="출석 번호"
        keyboardType="number-pad"
        maxLength={3}
        autoFocus
        accessibilityLabel="출석 번호"
        style={styles.input}
      />
    </Card>
  );
}

function AllergyStep({ onNext }: { onNext: () => void }) {
  const { palette, allergies, setAllergies } = useApp();

  return (
    <Card
      art="warn"
      title="못 먹는 재료가 있어요?"
      body="골라두면 급식에서 그 재료가 든 메뉴를 눈에 띄게 표시해줘요. 선생님도 다른 학생도 볼 수 없어요. 폰을 바꿔도 따라와요."
      nextLabel={allergies.length ? `${allergies.length}개 골랐어요` : '없어요'}
      onNext={onNext}
      onSkip={onNext}>
      <View style={styles.chips}>
        {ALLERGENS.map((name, i) => {
          const num = i + 1;
          const on = allergies.includes(num);
          return (
            <Tap
              key={name}
              onPress={() => setAllergies(on ? allergies.filter((x) => x !== num) : [...allergies, num])}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={name}
              depth={0.04}
              style={[styles.allergyChip, { backgroundColor: on ? palette.accent : palette.tint }]}>
              <Text style={[styles.allergyName, { color: on ? palette.onAccent : palette.text }]}>
                {name}
              </Text>
            </Tap>
          );
        })}
      </View>
    </Card>
  );
}

/**
 * 한 주 시간표를 컬러표로 보여주고 다른 과목을 듣는 칸이 있는지 물어봐요.
 *
 * 예전에는 오늘 하루만 목록으로 보여줬어요. 그런데 선택과목은 요일마다
 * 다른 교시에 흩어져 있어서, 오늘만 봐서는 고칠 게 있는지 알 수가 없어요.
 * 표로 한 주를 다 보여주면 눈으로 훑고 바꿀 칸만 누르면 돼요.
 * 목록 서른 줄은 아무도 안 읽지만, 표 한 장은 봐요.
 */
function SubjectStep({ onNext }: { onNext: () => void }) {
  const { palette, school, now, swaps } = useApp();
  const today = weekdayOf(now);
  const dates = weekDates(now);

  const cls = `${school?.grade ?? 1}-${school?.cls ?? '1'}`;
  const remote = useRemote(`setup-tt:${school?.code}:${cls}:${dates.월}`, () =>
    getLessons(school?.grade ?? 1, school?.cls ?? '1', dates.월, dates.금, school ?? undefined),
  );

  const raw = byWeekday(remote.data ?? [], dates);
  const week = withSwaps(raw, swaps);
  const any = WEEKDAYS.some((d) => week[d].some(Boolean));

  return (
    <Card
      art="timetable"
      title="이 과목들 맞아요?"
      body="선택과목은 반마다 대표 과목 하나만 올라와요. 실제로 다른 과목을 듣는 칸이 있으면 눌러서 바꿔주세요."
      nextLabel="다 맞아요"
      onNext={onNext}
      onSkip={onNext}>
      {remote.loading ? <Loading text="시간표를 불러오는 중이에요" rows={4} /> : null}
      {!remote.loading && !any ? (
        <Empty art="timetable" text="이번 주는 등록된 시간표가 없어요" hint="시간표에서 언제든 바꿀 수 있어요." />
      ) : null}
      {!remote.loading && any ? (
        <>
          <WeekGrid
            week={week}
            today={today}
            nowPeriod={currentPeriod(now)}
            swaps={swaps}
            onPick={(d, period) =>
              router.push({
                pathname: '/swap-subject',
                params: {
                  day: d,
                  period: String(period),
                  subject: raw[d][period - 1] ?? '',
                  same: sameNameSlots(raw, d, period, raw[d][period - 1]).join(','),
                },
              })
            }
          />
          <Text style={[styles.note, { color: palette.sub }]}>
            바꾼 칸에는 점이 찍혀요. 나중에 시간표에서 똑같이 바꿀 수 있어요.
          </Text>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotNow: { width: 24 },
  skipAll: { fontSize: 13, fontWeight: '700' },

  art: { width: 80, height: 80, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 34 },
  body: { fontSize: 15, lineHeight: 23, marginTop: 12 },
  content: { marginTop: 24 },
  input: { borderRadius: 16, height: 56, paddingHorizontal: 16, fontSize: 18 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyChip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 16, justifyContent: 'center' },
  allergyName: { fontSize: 13, fontWeight: '600' },

  note: { fontSize: 13, lineHeight: 20, marginTop: 16 },

  actions: { marginTop: 32 },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  skipText: { fontSize: 13, fontWeight: '700' },
});
