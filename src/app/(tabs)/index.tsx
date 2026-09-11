import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Reveal, Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Tile } from '@/components/tile';
import { Avatar } from '@/components/ui';
import { mix } from '@/constants/themes';
import { subjectTone } from '@/constants/tones';
import {
  BELL,
  classLabel,
  MEALS,
  STUDENT,
  TEACHER,
  TIMETABLES,
  type SchoolEvent,
  type Weekday,
} from '@/data/mock';
import { isPending, useApp } from '@/lib/app-state';
import { currentPeriod, dday, formatDay, schoolStatus, toYmd, weekdayOf, type SchoolStatus } from '@/lib/time';
import { useLayout } from '@/lib/layout';

export default function HomeScreen() {
  const { role } = useApp();
  return role === 'teacher' ? <TeacherHome /> : <StudentHome />;
}

/* ================= 뼈대 ================= */

/**
 * 위쪽은 큰 제목이 들어가는 색 영역, 아래쪽은 테두리 없는 본문이에요.
 * 네모 카드를 겹겹이 쌓지 않고 여백과 줄로만 나눠요.
 */
function HomeShell({ hero, children }: { hero: React.ReactNode; children: React.ReactNode }) {
  const { palette } = useApp();
  const insets = useSafeAreaInsets();
  const { compact, content, width } = useLayout();
  const inset = width > content + 48;

  return (
    <ScrollView
      style={[styles.shell, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.shellContent}
      showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[mix(palette.band, '#FFFFFF', 0.14), palette.band, mix(palette.band, '#000000', 0.1)]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          inset
            ? { marginTop: insets.top + 12, borderRadius: 30, alignSelf: 'center', width: '100%', maxWidth: content }
            : { paddingTop: insets.top, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
        ]}>
        <View style={[styles.column, { maxWidth: content, paddingTop: inset ? 22 : 14, paddingBottom: compact ? 22 : 28 }]}>
          {hero}
        </View>
      </LinearGradient>
      <View style={[styles.column, { maxWidth: content }]}>{children}</View>
    </ScrollView>
  );
}

/** 맨 윗줄: 날짜와 내 동그라미 */
function TopRow({ name }: { name: string }) {
  const { palette, now } = useApp();
  return (
    <View style={styles.topRow}>
      <View style={styles.fill}>
        <Text style={[styles.topDate, { color: palette.onAccent }]}>{formatDay(now)}</Text>
        <Text style={[styles.topName, { color: palette.onAccent }]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Avatar size={42} onPress={() => router.push('/profile')} />
    </View>
  );
}

/** 오늘 교시 진행 */
function Dots({ states }: { states: DotState[] }) {
  const { palette } = useApp();
  if (!states.length) return null;
  const done = states.filter((s) => s === 'done').length;
  return (
    <View style={styles.dots} accessible accessibilityLabel={`오늘 ${states.length}교시 중 ${done}교시 끝났어요`}>
      {states.map((s, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: palette.onAccent + '40' },
            s === 'done' && { backgroundColor: palette.onAccent + 'CC' },
            s === 'now' && [styles.dotNow, { backgroundColor: palette.onAccent }],
          ]}
        />
      ))}
    </View>
  );
}

/** 섹션 제목 한 줄. 카드 없이 제목과 값만 둬요. */
function Head({
  title,
  value,
  action,
  onAction,
}: {
  title: string;
  value?: string;
  action?: string;
  onAction?: () => void;
}) {
  const { palette } = useApp();
  return (
    <View style={styles.head}>
      <Text accessibilityRole="header" style={[styles.headTitle, { color: palette.text }]}>
        {title}
      </Text>
      {value ? (
        <Text numeric style={[styles.headValue, { color: palette.sub }]}>
          {value}
        </Text>
      ) : null}
      {action && onAction ? (
        <Tap onPress={onAction} accessibilityRole="button" hitSlop={10} depth={0.06} style={styles.headAction}>
          <Text style={[styles.headActionText, { color: palette.accentDeep }]}>{action}</Text>
          <Icon name="next" size={13} color={palette.accentDeep} />
        </Tap>
      ) : null}
    </View>
  );
}

/** 얇은 줄. 카드 대신 이걸로 나눠요. */
function Line() {
  const { palette } = useApp();
  return <View style={[styles.line, { backgroundColor: palette.line }]} />;
}

/** 일정 한 줄: 왼쪽에 D-day, 오른쪽에 제목 */
function EventRow({ event, last }: { event: SchoolEvent; last: boolean }) {
  const { palette, now } = useApp();
  const d = dday(event.date, now);
  const today = d === '오늘';
  const t = subjectTone(event.kind === 'assessment' ? (event.subject ?? '수행평가') : '학사일정', palette.scheme);

  return (
    <>
      <Tap
        onPress={() => router.push('/calendar')}
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${d}, 달력 열기`}
        depth={0.015}
        style={styles.eventRow}>
        <View style={[styles.ddayChip, { backgroundColor: today ? t.fg : t.bg }]}>
          <Text numeric={!today} style={[styles.ddayText, { color: today ? '#FFFFFF' : t.fg }]}>
            {d}
          </Text>
        </View>
        <View style={styles.fill}>
          <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={1}>
            {event.title}
          </Text>
        </View>
        <Text style={[styles.eventKind, { color: t.fg }]} numberOfLines={1}>
          {event.kind === 'assessment' ? (event.subject ?? '수행평가') : '학사일정'}
        </Text>
      </Tap>
      {last ? null : <Line />}
    </>
  );
}

/* ================= 학생 ================= */

type DotState = 'done' | 'now' | 'todo';
type Hero = { label: string; big: string; line: string; states: DotState[] };

function buildHero(status: SchoolStatus, day: Weekday | null): Hero {
  const week = TIMETABLES[STUDENT.cls];
  const today = day ? week[day] : [];
  const dots = (fn: (i: number) => DotState) => today.map((_, i) => fn(i));

  switch (status.kind) {
    case 'weekend':
      return { label: '오늘은', big: '쉬는 날', line: `월요일 1교시는 ${week['월'][0]}`, states: [] };
    case 'before':
      return {
        label: '곧 시작해요',
        big: `1교시 ${today[0]}`,
        line: `${BELL[0].start}부터`,
        states: dots((i) => (i === 0 ? 'now' : 'todo')),
      };
    case 'class': {
      const p = status.period;
      const next = today[p] ? ` · 다음 ${p + 1}교시 ${today[p]}` : '';
      return {
        label: '지금은',
        big: `${p}교시 ${today[p - 1]}`,
        line: `${BELL[p - 1].end}에 끝나요${next}`,
        states: dots((i) => (i < p - 1 ? 'done' : i === p - 1 ? 'now' : 'todo')),
      };
    }
    case 'break':
    case 'lunch': {
      const n = status.next;
      return {
        label: status.kind === 'lunch' ? '점심시간이에요' : '쉬는 시간이에요',
        big: `다음 ${n}교시 ${today[n - 1]}`,
        line: `${BELL[n - 1].start}부터`,
        states: dots((i) => (i < n - 1 ? 'done' : i === n - 1 ? 'now' : 'todo')),
      };
    }
    case 'after':
      return { label: '오늘 수업 끝', big: '수고했어요', line: '내일도 화이팅이에요', states: dots(() => 'done') };
  }
}

function StudentHome() {
  const { palette, now, events, threads } = useApp();
  const { compact } = useLayout();
  const day = weekdayOf(now);
  const hero = buildHero(schoolStatus(now), day);
  const upcoming = events.filter((e) => e.date >= toYmd(now)).sort((a, b) => a.date.localeCompare(b.date));
  const unread = threads.filter((t) => t.unreadStudent).length;
  const meal = day ? MEALS[day].lunch : null;

  const tiles = (
    <View style={styles.tiles}>
      <Tile icon="meal" tone="orange" label="급식" onPress={() => router.push('/meal')} />
      <Tile icon="timetable" tone="blue" label="시간표" onPress={() => router.push('/timetable')} />
      <Tile icon="calendar" tone="green" label="달력" onPress={() => router.push('/calendar')} />
      <Tile icon="chat" tone="violet" label="쪽지" badge={unread} onPress={() => router.push('/community')} />
    </View>
  );

  const mealBlock = (
    <>
      <Head title="오늘 점심" value={meal ? `${meal.kcal}kcal` : undefined} action="급식" onAction={() => router.push('/meal')} />
      <Text style={[styles.body, { color: palette.sub }]} numberOfLines={compact ? 2 : 3}>
        {meal ? meal.items.map((m) => m.name).join(' · ') : '오늘은 급식이 없어요'}
      </Text>
    </>
  );

  const eventBlock = (
    <>
      <Head title="다가오는 일정" action="달력" onAction={() => router.push('/calendar')} />
      {upcoming.length === 0 ? (
        <Text style={[styles.body, { color: palette.sub }]}>예정된 일정이 없어요</Text>
      ) : (
        upcoming.slice(0, 4).map((e, i, arr) => <EventRow key={e.id} event={e} last={i === arr.length - 1} />)
      )}
    </>
  );

  return (
    <HomeShell
      hero={
        <>
          <TopRow name={`${STUDENT.name.slice(1)}님`} />
          <Text style={[styles.heroLabel, { color: palette.onAccent }]}>{hero.label}</Text>
          <Text style={[styles.heroBig, compact && styles.heroBigCompact, { color: palette.onAccent }]} numberOfLines={2}>
            {hero.big}
          </Text>
          <Text style={[styles.heroLine, { color: palette.onAccent }]} numberOfLines={1}>
            {hero.line}
          </Text>
          <Dots states={hero.states} />
        </>
      }>
      <Reveal delay={60}>{tiles}</Reveal>
      <Reveal delay={140}>{mealBlock}</Reveal>
      <Reveal delay={200}>{eventBlock}</Reveal>
    </HomeShell>
  );
}

/* ================= 선생님 ================= */

function TeacherHome() {
  const { palette, now, events, threads } = useApp();
  const { compact } = useLayout();
  const day = weekdayOf(now);
  const pending = threads.filter(isPending);
  const upcoming = events.filter((e) => e.date >= toYmd(now)).sort((a, b) => a.date.localeCompare(b.date));
  const nowPeriod = currentPeriod(now);

  const myClasses = day
    ? TEACHER.classes
        .flatMap((cls) =>
          TIMETABLES[cls][day]
            .map((subject, i) => ({ cls, subject, period: i + 1 }))
            .filter((x) => TEACHER.subjects.some((s) => s === x.subject)),
        )
        .sort((a, b) => a.period - b.period)
    : [];
  const nextClass = myClasses.find((c) => c.period >= nowPeriod) ?? null;

  const tiles = (
    <View style={styles.tiles}>
      <Tile icon="inbox" tone="violet" label="쪽지함" badge={pending.length} onPress={() => router.push('/community')} />
      <Tile
        icon="plus"
        tone="green"
        label="일정 추가"
        onPress={() => router.push({ pathname: '/add-event', params: { date: toYmd(now) } })}
      />
      <Tile icon="timetable" tone="blue" label="시간표" onPress={() => router.push('/timetable')} />
      <Tile icon="meal" tone="orange" label="급식" onPress={() => router.push('/meal')} />
    </View>
  );

  const classBlock = (
    <>
      <Head title="오늘 내 수업" value={`${myClasses.length}개`} action="시간표" onAction={() => router.push('/timetable')} />
      <Text style={[styles.body, { color: palette.sub }]} numberOfLines={2}>
        {myClasses.length
          ? myClasses.map((c) => `${c.period}교시 ${classLabel(c.cls)}`).join(' · ')
          : '오늘은 수업이 없어요'}
      </Text>
    </>
  );

  const eventBlock = (
    <>
      <Head
        title="다가오는 일정"
        action="일정 추가"
        onAction={() => router.push({ pathname: '/add-event', params: { date: toYmd(now) } })}
      />
      {upcoming.length === 0 ? (
        <Text style={[styles.body, { color: palette.sub }]}>예정된 일정이 없어요</Text>
      ) : (
        upcoming.slice(0, 4).map((e, i, arr) => <EventRow key={e.id} event={e} last={i === arr.length - 1} />)
      )}
    </>
  );

  return (
    <HomeShell
      hero={
        <>
          <TopRow name={`${TEACHER.name} 선생님`} />
          <Text style={[styles.heroLabel, { color: palette.onAccent }]}>
            {pending.length ? '답변을 기다려요' : '오늘도 수고 많으세요'}
          </Text>
          <Text style={[styles.heroBig, compact && styles.heroBigCompact, { color: palette.onAccent }]} numberOfLines={2}>
            {pending.length ? `쪽지 ${pending.length}개` : '쪽지함 비움'}
          </Text>
          <Text style={[styles.heroLine, { color: palette.onAccent }]} numberOfLines={1}>
            {nextClass ? `다음 수업 ${nextClass.period}교시 ${classLabel(nextClass.cls)}` : '오늘 수업은 끝났어요'}
          </Text>
        </>
      }>
      <Reveal delay={60}>{tiles}</Reveal>
      <Reveal delay={140}>{classBlock}</Reveal>
      <Reveal delay={200}>{eventBlock}</Reveal>
    </HomeShell>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  shell: { flex: 1 },
  shellContent: { paddingBottom: 24 },
  column: { width: '100%', alignSelf: 'center', paddingHorizontal: 22 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 20 },
  topDate: { fontSize: 12, fontWeight: '600', opacity: 0.85 },
  topName: { fontSize: 15, fontWeight: '700', marginTop: 1 },

  heroLabel: { fontSize: 14, fontWeight: '600', opacity: 0.9 },
  heroBig: { fontSize: 33, lineHeight: 42, fontWeight: '700', letterSpacing: -1, marginTop: 3 },
  heroBigCompact: { fontSize: 27, lineHeight: 35 },
  heroLine: { fontSize: 14, fontWeight: '500', opacity: 0.9, marginTop: 6 },

  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, height: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotNow: { width: 22, borderRadius: 4 },

  tiles: { flexDirection: 'row', gap: 16, paddingTop: 26, paddingBottom: 8 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26, marginBottom: 10 },
  headTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
  headValue: { fontSize: 13, fontWeight: '600', flex: 1 },
  headAction: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  headActionText: { fontSize: 13, fontWeight: '600' },

  body: { fontSize: 15, lineHeight: 23, fontWeight: '500' },
  line: { height: 1, opacity: 0.7 },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  ddayChip: { minWidth: 48, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  ddayText: { fontSize: 12, fontWeight: '700' },
  eventTitle: { fontSize: 15, fontWeight: '600' },
  eventKind: { fontSize: 12, fontWeight: '600' },

});
