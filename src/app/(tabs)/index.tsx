import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { EventRow, ThreadRow } from '@/components/rows';
import { Button, Card, Divider, Empty, Header, Screen, SectionTitle, Tag } from '@/components/ui';
import {
  BELL,
  classLabel,
  MEALS,
  STUDENT,
  TEACHER,
  TIMETABLES,
  type Weekday,
} from '@/data/mock';
import { isPending, useApp } from '@/lib/app-state';
import { currentPeriod, formatDay, schoolStatus, toYmd, weekdayOf, type SchoolStatus } from '@/lib/time';

export default function HomeScreen() {
  const { role } = useApp();
  return role === 'teacher' ? <TeacherHome /> : <StudentHome />;
}

/* ---------------- 학생 홈 ---------------- */

type Hero = { label: string; big: string; line: string; states: DotState[]; next?: string };
type DotState = 'done' | 'now' | 'next' | 'todo';

function buildStudentHero(status: SchoolStatus, day: Weekday | null): Hero {
  const week = TIMETABLES[STUDENT.cls];
  const today = day ? week[day] : [];
  const dots = (fn: (i: number) => DotState) => today.map((_, i) => fn(i));

  switch (status.kind) {
    case 'weekend':
      return { label: '오늘은 쉬는 날', big: '주말', line: `월요일 1교시는 ${week['월'][0]}`, states: [] };
    case 'before':
      return {
        label: '오늘 첫 수업',
        big: today[0],
        line: `1교시, ${BELL[0].start} 시작`,
        states: dots((i) => (i === 0 ? 'next' : 'todo')),
      };
    case 'class': {
      const p = status.period;
      return {
        label: '지금 수업',
        big: today[p - 1],
        line: `${p}교시, ${BELL[p - 1].end}에 끝나요`,
        states: dots((i) => (i < p - 1 ? 'done' : i === p - 1 ? 'now' : 'todo')),
        next: today[p] ? `${p + 1}교시 ${today[p]}` : undefined,
      };
    }
    case 'break':
    case 'lunch': {
      const n = status.next;
      return {
        label: status.kind === 'lunch' ? '점심시간, 다음 수업은' : '쉬는 시간, 다음 수업은',
        big: today[n - 1],
        line: `${n}교시, ${BELL[n - 1].start} 시작`,
        states: dots((i) => (i < n - 1 ? 'done' : i === n - 1 ? 'next' : 'todo')),
      };
    }
    case 'after':
      return {
        label: '오늘 수업 끝',
        big: '수고했어요',
        line: '내일 시간표는 시간표 탭에서 볼 수 있어요',
        states: dots(() => 'done'),
      };
  }
}

function PeriodDots({ states }: { states: DotState[] }) {
  const { palette } = useApp();
  if (!states.length) return null;
  const doneCount = states.filter((s) => s === 'done').length;
  return (
    <View
      style={styles.dots}
      accessible
      accessibilityLabel={`오늘 ${states.length}교시 중 ${doneCount}교시 끝났어요`}>
      {states.map((s, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            s === 'done' && { backgroundColor: palette.accent, borderColor: palette.accent },
            s === 'now' && [styles.dotNow, { backgroundColor: palette.accent, borderColor: palette.tintMid }],
            s === 'next' && { borderColor: palette.accent, borderWidth: 3 },
            s === 'todo' && { borderColor: palette.tintMid },
          ]}
        />
      ))}
    </View>
  );
}

function StudentHome() {
  const { palette, now, events, threads } = useApp();
  const day = weekdayOf(now);
  const hero = buildStudentHero(schoolStatus(now), day);
  const upcoming = events.filter((e) => e.date >= toYmd(now)).sort((a, b) => a.date.localeCompare(b.date));
  const newAnswer = threads.find((t) => t.unreadStudent);

  return (
    <Screen>
      <Header subtitle={formatDay(now)} title={`안녕하세요, ${STUDENT.name.slice(1)}님`} />

      <Pressable
        onPress={() => router.push('/timetable')}
        accessibilityRole="button"
        accessibilityLabel={`${hero.label} ${hero.big}. ${hero.line}. 시간표 열기`}
        style={({ pressed }) => [styles.hero, { backgroundColor: palette.tint }, pressed && styles.pressed]}>
        <View style={styles.heroTop}>
          <Text style={[styles.heroLabel, { color: palette.accentDeep }]}>{hero.label}</Text>
          {/* 누르면 시간표로 간다는 걸 화살표로 알려줘요. */}
          <Icon name="next" size={18} color={palette.accentDeep} />
        </View>
        <Text style={[styles.heroBig, { color: palette.text }]} numberOfLines={1}>
          {hero.big}
        </Text>
        <Text style={[styles.heroLine, { color: palette.sub }]}>{hero.line}</Text>
        <PeriodDots states={hero.states} />
        {hero.next ? (
          <View style={[styles.heroNext, { borderTopColor: palette.tintMid }]}>
            <Text style={[styles.heroNextLabel, { color: palette.sub }]}>다음</Text>
            <Text style={[styles.heroNextText, { color: palette.text }]}>{hero.next}</Text>
          </View>
        ) : null}
      </Pressable>

      <TodayMealCard day={day} />

      {newAnswer ? (
        <>
          <SectionTitle title="새 답변" action="커뮤니티" onAction={() => router.push('/community')} />
          <ThreadRow
            thread={newAnswer}
            onPress={() => router.push({ pathname: '/thread', params: { id: newAnswer.id } })}
          />
        </>
      ) : null}

      <SectionTitle title="다가오는 일정" action="달력" onAction={() => router.push('/calendar')} />
      <Card style={styles.listCard}>
        {upcoming.length === 0 ? <Empty text="예정된 일정이 없어요" /> : null}
        {upcoming.slice(0, 3).map((e, i) => (
          <View key={e.id}>
            {i > 0 ? <Divider /> : null}
            <EventRow event={e} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

/* ---------------- 선생님 홈 ---------------- */

function TeacherHome() {
  const { palette, now, events, threads } = useApp();
  const day = weekdayOf(now);
  const pending = threads.filter(isPending);
  const oldest = pending[pending.length - 1];
  const upcoming = events.filter((e) => e.date >= toYmd(now)).sort((a, b) => a.date.localeCompare(b.date));
  const nowPeriod = currentPeriod(now);

  // 오늘 내가 들어가는 수업 찾기
  const myClasses = day
    ? TEACHER.classes
        .flatMap((cls) =>
          TIMETABLES[cls][day]
            .map((subject, i) => ({ cls, subject, period: i + 1 }))
            .filter((x) => TEACHER.subjects.some((s) => s === x.subject)),
        )
        .sort((a, b) => a.period - b.period)
    : [];

  return (
    <Screen>
      <Header subtitle={formatDay(now)} title={`${TEACHER.name} 선생님`} />

      <View style={[styles.hero, { backgroundColor: palette.tint }]}>
        <Text style={[styles.heroLabel, { color: palette.accentDeep }]}>답변을 기다리는 쪽지</Text>
        <View style={styles.countRow}>
          <Text style={[styles.heroBig, { color: palette.text }]}>{pending.length}</Text>
          <Text style={[styles.countUnit, { color: palette.text }]}>개</Text>
        </View>
        <Text style={[styles.heroLine, { color: palette.sub }]}>
          {oldest
            ? `가장 오래 기다린 쪽지는 ${oldest.student.name} 학생, ${oldest.messages[oldest.messages.length - 1].time}`
            : '모든 쪽지에 답했어요'}
        </Text>
        <View style={styles.heroButton}>
          <Button label="쪽지함 열기" icon="inbox" onPress={() => router.push('/community')} />
        </View>
      </View>

      <SectionTitle title="오늘 내 수업" action="시간표" onAction={() => router.push('/timetable')} />
      <Card style={styles.listCard}>
        {myClasses.length === 0 ? <Empty text="오늘은 수업이 없어요" /> : null}
        {myClasses.map((c, i) => {
          const state = c.period === nowPeriod ? 'now' : c.period < nowPeriod ? 'done' : 'todo';
          return (
            <View key={`${c.cls}-${c.period}`}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.classRow}>
                <Text style={[styles.classPeriod, { color: state === 'done' ? palette.sub : palette.text }]}>
                  {c.period}
                </Text>
                <View style={styles.fill}>
                  <Text style={[styles.classTitle, { color: state === 'done' ? palette.sub : palette.text }]}>
                    {classLabel(c.cls)} {c.subject}
                  </Text>
                  <Text style={[styles.classTime, { color: palette.sub }]}>
                    {BELL[c.period - 1].start}부터 {BELL[c.period - 1].end}까지
                  </Text>
                </View>
                {state === 'now' ? <Tag label="지금" tone="solid" /> : null}
                {state === 'done' ? <Tag label="끝남" tone="plain" /> : null}
              </View>
            </View>
          );
        })}
      </Card>

      <TodayMealCard day={day} />

      <SectionTitle
        title="다가오는 일정"
        action="일정 추가"
        onAction={() => router.push({ pathname: '/add-event', params: { date: toYmd(now) } })}
      />
      <Card style={styles.listCard}>
        {upcoming.length === 0 ? <Empty text="예정된 일정이 없어요" /> : null}
        {upcoming.slice(0, 3).map((e, i) => (
          <View key={e.id}>
            {i > 0 ? <Divider /> : null}
            <EventRow event={e} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

/* ---------------- 공통: 오늘 점심 ---------------- */

function TodayMealCard({ day }: { day: Weekday | null }) {
  const { palette } = useApp();
  const meal = day ? MEALS[day].lunch : null;
  return (
    <Card onPress={() => router.push('/meal')} label="오늘 점심 메뉴, 급식 화면 열기">
      <View style={styles.mealHead}>
        <Icon name="meal" size={22} color={palette.accent} />
        <Text style={[styles.mealTitle, { color: palette.text }]}>오늘 점심</Text>
        <View style={styles.fill} />
        {meal ? <Text style={[styles.mealKcal, { color: palette.sub }]}>{meal.kcal}kcal</Text> : null}
        <Icon name="next" size={18} color={palette.sub} />
      </View>
      <Text style={[styles.mealMenu, { color: palette.text }]}>
        {meal ? meal.items.map((m) => m.name).join(', ') : '오늘은 급식이 없어요'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },

  hero: { borderRadius: 28, padding: 24, marginBottom: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { fontSize: 16, fontWeight: '700' },
  heroBig: { fontSize: 60, lineHeight: 70, fontWeight: '800', letterSpacing: -2, marginTop: 4 },
  heroLine: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
  heroNext: { flexDirection: 'row', gap: 10, marginTop: 18, paddingTop: 14, borderTopWidth: 1.5 },
  heroNextLabel: { fontSize: 16, fontWeight: '600' },
  heroNextText: { fontSize: 16, fontWeight: '800' },
  heroButton: { marginTop: 18 },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  countUnit: { fontSize: 24, fontWeight: '800' },

  dots: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  dotNow: { width: 24, height: 24, borderRadius: 12, borderWidth: 4 },

  listCard: { paddingVertical: 6 },

  classRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  classPeriod: { width: 32, fontSize: 26, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  classTitle: { fontSize: 16, fontWeight: '700' },
  classTime: { fontSize: 14, marginTop: 2 },

  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  mealTitle: { fontSize: 18, fontWeight: '800' },
  mealKcal: { fontSize: 15, fontWeight: '600' },
  mealMenu: { fontSize: 16, lineHeight: 24 },
});
