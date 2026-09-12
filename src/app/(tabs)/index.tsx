import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Pop, Reveal, Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Tile } from '@/components/tile';
import { Avatar } from '@/components/ui';
import { mix } from '@/constants/themes';
import { subjectTone } from '@/constants/tones';
import { getLessons, getMeals } from '@/lib/api';
import { readSubject, subjectGroup } from '@/lib/subject';
import { byWeekday, type Week } from '@/lib/timetable';
import { useRemote } from '@/lib/use-remote';
import {
  BELL,
  classLabel,
  classOf,
  gradeOf,
  type SchoolEvent,
  type Weekday,
} from '@/data/mock';
import { isPending, useApp } from '@/lib/app-state';
import { currentPeriod, dday, formatDay, fromYmd, schoolStatus, toYmd, weekDates, weekdayOf, type SchoolStatus } from '@/lib/time';
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

function buildHero(status: SchoolStatus, day: Weekday | null, week: Week, ready: boolean): Hero {
  const today = (day ? week[day] : []).map((s) => (s ? readSubject(s).name : ''));
  const dots = (fn: (i: number) => DotState) => today.map((_, i) => fn(i));

  // 시간표가 아직 안 왔으면 과목 이름 없이 시각만 알려줘요.
  // 빈 자리에 엉뚱한 글자가 잠깐 보이는 것보다 나아요.
  if (!ready) {
    return { label: '오늘', big: '불러오는 중', line: '잠시만요', states: [] };
  }

  switch (status.kind) {
    case 'weekend':
      return {
        label: '오늘은',
        big: '쉬는 날',
        line: week['월'][0] ? `월요일 1교시는 ${readSubject(week['월'][0]).name}` : '다음 주에 만나요',
        states: [],
      };
    case 'before':
      return {
        label: '곧 시작해요',
        big: today[0] ? `1교시 ${today[0]}` : '오늘 수업',
        line: `${BELL[0].start}부터`,
        states: dots((i) => (i === 0 ? 'now' : 'todo')),
      };
    case 'class': {
      const p = status.period;
      const next = today[p] ? ` · 다음 ${p + 1}교시 ${today[p]}` : '';
      return {
        label: '지금은',
        big: today[p - 1] ? `${p}교시 ${today[p - 1]}` : `${p}교시`,
        line: `${BELL[p - 1].end}에 끝나요${next}`,
        states: dots((i) => (i < p - 1 ? 'done' : i === p - 1 ? 'now' : 'todo')),
      };
    }
    case 'break':
    case 'lunch': {
      const n = status.next;
      return {
        label: status.kind === 'lunch' ? '점심시간이에요' : '쉬는 시간이에요',
        big: today[n - 1] ? `다음 ${n}교시 ${today[n - 1]}` : `다음 ${n}교시`,
        line: `${BELL[n - 1].start}부터`,
        states: dots((i) => (i < n - 1 ? 'done' : i === n - 1 ? 'now' : 'todo')),
      };
    }
    case 'after':
      return { label: '오늘 수업 끝', big: '수고했어요', line: '내일도 화이팅이에요', states: dots(() => 'done') };
  }
}

function StudentHome() {
  const { palette, now, events, threads, school, swaps, me } = useApp();
  const { compact } = useLayout();
  const day = weekdayOf(now);
  const dates = weekDates(now);
  const today = toYmd(now);

  // 탭 화면은 학교를 고른 뒤에만 열려요. 그래서 school은 항상 있어요.
  const myClass = `${school?.grade ?? 1}-${school?.cls ?? '1'}`;
  const lessons = useRemote(`home-timetable:${school?.code}:${myClass}:${dates.월}`, () =>
    getLessons(gradeOf(myClass), classOf(myClass), dates.월, dates.금, school ?? undefined),
  );
  const meals = useRemote(`home-meal:${school?.code}:${today}`, () =>
    getMeals(today, today, school ?? undefined),
  );

  const week = byWeekday(lessons.data ?? [], dates, swaps);
  const hero = buildHero(schoolStatus(now), day, week, !lessons.loading);
  const upcoming = events.filter((e) => e.date >= toYmd(now)).sort((a, b) => a.date.localeCompare(b.date));
  const unread = threads.filter((t) => t.unreadStudent).length;
  const meal = meals.data?.find((m) => m.type === 'lunch') ?? null;

  /*
   * 달력 아이콘에 붙는 딱지예요. 가장 가까운 수행평가까지 며칠 남았는지 보여줘요.
   * 놓치면 곤란한 일이라 달력을 열기 전에 알려주는 게 나아요.
   * 일주일보다 멀면 안 붙여요. 늘 붙어 있으면 아무도 안 봐요.
   */
  const nextAssessment = upcoming.find((e) => e.kind === 'assessment');
  const left = nextAssessment
    ? Math.round((fromYmd(nextAssessment.date).getTime() - fromYmd(today).getTime()) / 86400000)
    : null;
  const calendarTag = left !== null && left <= 7 ? dday(nextAssessment!.date, now) : undefined;

  const tiles = (
    <View style={styles.tiles}>
      <Pop delay={80}>
        <Tile art="meal" tone="orange" label="급식" onPress={() => router.push('/meal')} />
      </Pop>
      <Pop delay={140}>
        <Tile art="timetable" tone="blue" label="시간표" onPress={() => router.push('/timetable')} />
      </Pop>
      <Pop delay={200}>
        <Tile art="calendar" tone="green" label="달력" tag={calendarTag} onPress={() => router.push('/calendar')} />
      </Pop>
      <Pop delay={260}>
        <Tile art="chat" tone="violet" label="쪽지" badge={unread} onPress={() => router.push('/community')} />
      </Pop>
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
          <TopRow name={me ? `${me.name}님` : ''} />
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
  const { palette, now, events, threads, school, me } = useApp();
  const { compact } = useLayout();
  const pending = threads.filter(isPending);
  const upcoming = events.filter((e) => e.date >= toYmd(now)).sort((a, b) => a.date.localeCompare(b.date));
  const nowPeriod = currentPeriod(now);

  /*
   * 맡은 반의 오늘 시간표를 받아와요.
   *
   * 예전에는 '이 선생님이 가르치는 반 목록'을 가짜로 박아뒀어요(2-1, 2-3).
   * 학교가 바뀌면 있지도 않은 반이라 아무것도 안 나와요. 지금 우리가 확실히
   * 아는 반은 설정에서 직접 고른 반 하나뿐이라, 그 반만 보여주고 그렇게 적어요.
   * 담당 반을 여러 개 받는 건 나중에 따로 만들어요.
   */
  const myClass = `${school?.grade ?? 1}-${school?.cls ?? '1'}`;
  const dates = weekDates(now);
  const lessons = useRemote(`teacher-timetable:${school?.code}:${myClass}:${dates.월}`, () =>
    getLessons(gradeOf(myClass), classOf(myClass), dates.월, dates.금, school ?? undefined),
  );

  // 실제 과목 이름은 '미적분Ⅰ' 처럼 와요. 수학 선생님이면 수학 교과군을
  // 전부 내 수업으로 봐요. 이름을 하나하나 맞춰보면 하나도 안 걸려요.
  const mine = new Set((me?.subjects ?? []).map((s) => subjectGroup(s)));
  const today = (lessons.data ?? [])
    .filter((l) => l.date === toYmd(now))
    .sort((a, b) => a.period - b.period);
  const myClasses = today
    .filter((l) => mine.has(subjectGroup(l.subject)))
    .map((l) => ({ subject: readSubject(l.subject).name, period: l.period }));
  const nextClass = myClasses.find((c) => c.period >= nowPeriod) ?? null;

  const tiles = (
    <View style={styles.tiles}>
      <Pop delay={80}>
        <Tile art="inbox" tone="violet" label="쪽지함" badge={pending.length} onPress={() => router.push('/community')} />
      </Pop>
      <Pop delay={140}>
        <Tile
          art="memo"
          tone="green"
          label="일정 추가"
          onPress={() => router.push({ pathname: '/add-event', params: { date: toYmd(now) } })}
        />
      </Pop>
      <Pop delay={200}>
        <Tile art="timetable" tone="blue" label="시간표" onPress={() => router.push('/timetable')} />
      </Pop>
      <Pop delay={260}>
        <Tile art="meal" tone="orange" label="급식" onPress={() => router.push('/meal')} />
      </Pop>
    </View>
  );

  const classBlock = (
    <>
      <Head
        title={`${classLabel(myClass)} 오늘 수업`}
        value={myClasses.length ? `내 수업 ${myClasses.length}개` : undefined}
        action="시간표"
        onAction={() => router.push('/timetable')}
      />
      <Text style={[styles.body, { color: palette.sub }]} numberOfLines={2}>
        {myClasses.length
          ? myClasses.map((c) => `${c.period}교시 ${c.subject}`).join(' · ')
          : today.length
            ? '이 반에서 맡으신 수업은 오늘 없어요'
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
          <TopRow name={me ? `${me.name} 선생님` : ''} />
          <Text style={[styles.heroLabel, { color: palette.onAccent }]}>
            {pending.length ? '답변을 기다려요' : '오늘도 수고 많으세요'}
          </Text>
          <Text style={[styles.heroBig, compact && styles.heroBigCompact, { color: palette.onAccent }]} numberOfLines={2}>
            {pending.length ? `쪽지 ${pending.length}개` : '쪽지함 비움'}
          </Text>
          <Text style={[styles.heroLine, { color: palette.onAccent }]} numberOfLines={1}>
            {nextClass
              ? `다음 수업 ${nextClass.period}교시 ${nextClass.subject}`
              : '오늘 수업은 끝났어요'}
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
  column: { width: '100%', alignSelf: 'center', paddingHorizontal: 20 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 20 },
  topDate: { fontSize: 12, fontWeight: '600', opacity: 0.85 },
  topName: { fontSize: 15, fontWeight: '700', marginTop: 1 },

  heroLabel: { fontSize: 13, fontWeight: '600', opacity: 0.9 },
  heroBig: { fontSize: 32, lineHeight: 42, fontWeight: '700', letterSpacing: -1, marginTop: 4 },
  heroBigCompact: { fontSize: 24, lineHeight: 35 },
  heroLine: { fontSize: 13, fontWeight: '500', opacity: 0.9, marginTop: 4 },

  dots: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16, height: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotNow: { width: 22, borderRadius: 4 },

  tiles: { flexDirection: 'row', gap: 16, paddingTop: 24, paddingBottom: 8 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 8 },
  headTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
  headValue: { fontSize: 13, fontWeight: '600', flex: 1 },
  headAction: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  headActionText: { fontSize: 13, fontWeight: '600' },

  body: { fontSize: 15, lineHeight: 23, fontWeight: '500' },
  line: { height: 1, opacity: 0.7 },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  ddayChip: { minWidth: 48, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  ddayText: { fontSize: 12, fontWeight: '700' },
  eventTitle: { fontSize: 15, fontWeight: '600' },
  eventKind: { fontSize: 12, fontWeight: '600' },

});
