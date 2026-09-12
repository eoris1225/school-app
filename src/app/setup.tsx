import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { Pop, Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Button, Empty, Field, Loading, Screen } from '@/components/ui';
import { ALLERGENS, BELL } from '@/data/mock';
import { getLessons } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { saveSetupSeen, slotKey } from '@/lib/my-settings';
import { readSubject } from '@/lib/subject';
import { weekDates, weekdayOf } from '@/lib/time';
import { byWeekday, withSwaps } from '@/lib/timetable';
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
  const { palette, school, setSchool } = useApp();
  const [at, setAt] = useState(0);
  const step = STEPS[at];

  const done = () => {
    void saveSetupSeen();
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
      body="골라두면 급식에서 그 재료가 든 메뉴를 눈에 띄게 표시해줘요. 이 기기에만 담기고 아무에게도 안 보여요."
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
 * 오늘 시간표를 보여주고 다른 과목을 듣는 교시가 있는지 물어봐요.
 *
 * 한 주를 다 보여주면 서른 줄이 넘어서 아무도 안 봐요. 오늘 하루만
 * 보여주고, 고치는 방법을 여기서 한 번 알려주는 게 나아요.
 * 나머지 요일은 시간표에서 똑같이 하면 돼요.
 */
function SubjectStep({ onNext }: { onNext: () => void }) {
  const { palette, school, now, swaps } = useApp();
  const day = weekdayOf(now);
  const dates = weekDates(now);

  const cls = `${school?.grade ?? 1}-${school?.cls ?? '1'}`;
  const remote = useRemote(`setup-tt:${school?.code}:${cls}:${dates.월}`, () =>
    getLessons(school?.grade ?? 1, school?.cls ?? '1', dates.월, dates.금, school ?? undefined),
  );

  const raw = byWeekday(remote.data ?? [], dates);
  const week = withSwaps(raw, swaps);
  const today = day ? week[day] : [];
  const rows = today
    .map((subject, i) => ({ subject, period: i + 1 }))
    .filter((r) => !!r.subject);

  return (
    <Card
      art="timetable"
      title="이 과목들 맞아요?"
      body={
        day
          ? '선택과목은 반마다 대표 과목 하나만 올라와요. 실제로 다른 과목을 듣는 교시가 있으면 눌러서 바꿔주세요.'
          : '오늘은 수업이 없어요. 시간표에서 교시를 누르면 언제든 바꿀 수 있어요.'
      }
      nextLabel="다 맞아요"
      onNext={onNext}
      onSkip={onNext}>
      {remote.loading ? <Loading text="시간표를 불러오는 중이에요" rows={3} /> : null}
      {!remote.loading && rows.length === 0 ? (
        <Empty art="timetable" text="오늘은 등록된 시간표가 없어요" />
      ) : null}
      {rows.map((r) => {
        const original = raw[day!][r.period - 1];
        const changed = swaps[slotKey(day!, r.period)] !== undefined;
        return (
          <Tap
            key={r.period}
            onPress={() =>
              router.push({
                pathname: '/swap-subject',
                params: { day: day!, period: String(r.period), subject: original, same: '' },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`${r.period}교시 ${readSubject(r.subject).name}, 눌러서 바꾸기`}
            depth={0.03}
            style={[styles.row, { borderBottomColor: palette.line }]}>
            <Text style={[styles.period, { color: palette.sub }]}>{r.period}교시</Text>
            <Text style={[styles.subject, { color: palette.text }]} numberOfLines={1}>
              {readSubject(r.subject).name}
            </Text>
            <Text style={[styles.hint, { color: changed ? palette.accentDeep : palette.sub }]}>
              {changed ? '바꿈' : '바꾸기'}
            </Text>
          </Tap>
        );
      })}
      {rows.length && BELL.length ? (
        <Text style={[styles.note, { color: palette.sub }]}>
          다른 요일도 시간표에서 똑같이 바꿀 수 있어요.
        </Text>
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

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  period: { fontSize: 13, fontWeight: '700', width: 48 },
  subject: { flex: 1, fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 13, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 20, marginTop: 16 },

  actions: { marginTop: 32 },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  skipText: { fontSize: 13, fontWeight: '700' },
});
