import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { Avatar, MAX_WIDTH } from '@/components/ui';
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
import { useLayout } from '@/lib/layout';
import { currentPeriod, dday, formatDay, fromYmd, schoolStatus, toYmd, weekdayOf, type SchoolStatus } from '@/lib/time';

export default function HomeScreen() {
  const { role } = useApp();
  return role === 'teacher' ? <TeacherHome /> : <StudentHome />;
}

/* ================= 공통 뼈대 ================= */

/**
 * 스크롤 없이 한 화면에 들어가는 홈이에요.
 * 위쪽은 테마색 밴드, 아래쪽은 카드 영역으로 나뉘어요.
 */
function HomeShell({ band, children }: { band: React.ReactNode; children: React.ReactNode }) {
  const { palette } = useApp();
  const insets = useSafeAreaInsets();
  const { compact, short, home } = useLayout();

  const inner = (
    <>
      <View
        style={[
          styles.band,
          compact && styles.bandCompact,
          { backgroundColor: palette.accent, paddingTop: insets.top + (compact ? 6 : 10) },
        ]}>
        <View style={[styles.bandInner, { maxWidth: home }]}>{band}</View>
      </View>
      <View style={[styles.body, compact && styles.bodyCompact, short && styles.bodyAuto, { maxWidth: home }]}>
        {children}
      </View>
    </>
  );

  // 폰을 눕히면 한 화면에 다 담을 수 없어서, 그때만 스크롤을 허용해요.
  if (short) {
    return (
      <ScrollView
        style={[styles.shell, { backgroundColor: palette.bg }]}
        contentContainerStyle={styles.shellScroll}
        showsVerticalScrollIndicator={false}>
        {inner}
      </ScrollView>
    );
  }
  return <View style={[styles.shell, { backgroundColor: palette.bg }]}>{inner}</View>;
}

/** 밴드 맨 위 줄: 날짜와 내 동그라미 */
function BandTop({ title }: { title: string }) {
  const { palette, now } = useApp();
  const { compact, tablet } = useLayout();
  return (
    <View style={[styles.bandTop, compact && styles.bandTopCompact]}>
      <View style={styles.fill}>
        <Text style={[styles.bandDate, { color: palette.onAccent }]}>{formatDay(now)}</Text>
        <Text
          accessibilityRole="header"
          style={[
            styles.bandName,
            compact && styles.bandNameCompact,
            tablet && styles.bandNameWide,
            { color: palette.onAccent },
          ]}
          numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Avatar size={44} onPress={() => router.push('/profile')} />
    </View>
  );
}

/** 예시 이미지처럼 밴드 안에 들어가는 3칸 요약 */
function StatStrip({ items }: { items: { label: string; value: string; sub: string; onPress: () => void }[] }) {
  const { palette } = useApp();
  const { compact } = useLayout();
  return (
    <View
      style={[
        styles.strip,
        compact && styles.stripCompact,
        { backgroundColor: palette.onAccent + '26', borderColor: palette.onAccent + '33' },
      ]}>
      {items.map((it, i) => (
        <View key={it.label} style={styles.fill}>
          {i > 0 ? <View style={[styles.stripLine, { backgroundColor: palette.onAccent + '40' }]} /> : null}
          <Pressable
            onPress={it.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${it.label} ${it.value} ${it.sub}`}
            style={({ pressed }) => [styles.stripItem, compact && styles.stripItemCompact, pressed && styles.pressed]}>
            <Text style={[styles.stripLabel, { color: palette.onAccent }]}>{it.label}</Text>
            <Text style={[styles.stripValue, { color: palette.onAccent }, compact && styles.stripValueCompact]} numberOfLines={1}>
              {it.value}
            </Text>
            <Text style={[styles.stripSub, { color: palette.onAccent }]} numberOfLines={1}>
              {it.sub}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

/** 오늘 교시 진행을 점으로 */
function PeriodDots({ states }: { states: DotState[] }) {
  const { palette } = useApp();
  const { compact } = useLayout();
  if (!states.length) return null;
  const done = states.filter((s) => s === 'done').length;
  return (
    <View style={[styles.dots, compact && styles.dotsCompact]} accessible accessibilityLabel={`오늘 ${states.length}교시 중 ${done}교시 끝났어요`}>
      {states.map((s, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { borderColor: palette.onAccent + '80' },
            s === 'done' && { backgroundColor: palette.onAccent, borderColor: palette.onAccent },
            s === 'now' && [styles.dotNow, { backgroundColor: palette.onAccent, borderColor: palette.onAccent + '66' }],
            s === 'next' && { borderColor: palette.onAccent, borderWidth: 3 },
          ]}
        />
      ))}
    </View>
  );
}

/** 큰 카드 한 장: 왼쪽 아이콘, 가운데 글, 오른쪽 화살표 */
function WideCard({
  icon,
  title,
  body,
  right,
  onPress,
  label,
}: {
  icon: IconName;
  title: string;
  body: string;
  right?: string;
  onPress: () => void;
  label: string;
}) {
  const { palette } = useApp();
  const { compact, tablet } = useLayout();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.wide,
        { borderColor: palette.line, backgroundColor: palette.surface },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.wideIcon, { backgroundColor: palette.tint }]}>
        <Icon name={icon} size={22} color={palette.accentDeep} />
      </View>
      <View style={styles.fill}>
        <View style={styles.wideHead}>
          <Text style={[styles.wideTitle, tablet && styles.wideTitleWide, { color: palette.text }]}>{title}</Text>
          {right ? <Text style={[styles.wideRight, { color: palette.sub }]}>{right}</Text> : null}
          <Icon name="next" size={16} color={palette.sub} />
        </View>
        <Text style={[styles.wideBody, { color: palette.sub }]} numberOfLines={compact ? 1 : 2}>
          {body}
        </Text>
      </View>
    </Pressable>
  );
}

/** 섹션 제목 + 오른쪽 바로가기 */
function Row({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  const { palette } = useApp();
  const { compact, tablet } = useLayout();
  return (
    <View style={[styles.rowHead, compact && styles.rowHeadCompact]}>
      <Text accessibilityRole="header" style={[styles.rowTitle, tablet && styles.rowTitleWide, { color: palette.text }]}>
        {title}
      </Text>
      <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10} style={styles.rowAction}>
        <Text style={[styles.rowActionText, { color: palette.accentDeep }]}>{action}</Text>
        <Icon name="next" size={14} color={palette.accentDeep} />
      </Pressable>
    </View>
  );
}

/** 가로로 넘겨 보는 일정 카드 */
function EventCards({ events }: { events: SchoolEvent[] }) {
  const { palette, now } = useApp();
  const { compact } = useLayout();

  if (events.length === 0) {
    return (
      <View style={[styles.emptyCard, { borderColor: palette.line }]}>
        <Text style={[styles.emptyText, { color: palette.sub }]}>예정된 일정이 없어요</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.cardScroll}
      contentContainerStyle={styles.cardRow}>
      {events.slice(0, 5).map((e) => {
        const d = dday(e.date, now);
        const today = d === '오늘';
        const date = fromYmd(e.date);
        return (
          <Pressable
            key={e.id}
            onPress={() => router.push('/calendar')}
            accessibilityRole="button"
            accessibilityLabel={`${e.title}, ${d}, 달력 열기`}
            style={({ pressed }) => [
              styles.eventCard,
              compact && styles.eventCardCompact,
              today
                ? { backgroundColor: palette.accent, borderColor: palette.accent }
                : { backgroundColor: palette.surface, borderColor: palette.line },
              pressed && styles.pressed,
            ]}>
            <View style={styles.eventTop}>
              <Text style={[styles.eventDate, { color: today ? palette.onAccent : palette.sub }]}>
                {date.getMonth() + 1}/{date.getDate()}
              </Text>
              <View
                style={[
                  styles.ddayPill,
                  today
                    ? { backgroundColor: palette.onAccent + '33' }
                    : { backgroundColor: e.kind === 'assessment' ? palette.tint : palette.bg },
                ]}>
                <Text style={[styles.ddayText, { color: today ? palette.onAccent : palette.accentDeep }]}>{d}</Text>
              </View>
            </View>
            <Text
              style={[styles.eventTitle, { color: today ? palette.onAccent : palette.text }]}
              numberOfLines={2}>
              {e.title}
            </Text>
            <Text style={[styles.eventKind, { color: today ? palette.onAccent : palette.sub }]} numberOfLines={1}>
              {e.kind === 'assessment' ? `수행평가 · ${e.subject ?? ''}` : '학사일정'}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * 큰 화면에서 남는 공간을 채우는 '오늘 수업' 목록이에요.
 * 화면이 짧으면 이 블록은 아예 빠져요.
 */
const EVENT_ROW_H = 62;

/** 넓은 화면의 오른쪽 칸에 쓰는 세로 일정 목록이에요. */
function EventList({ events }: { events: SchoolEvent[] }) {
  const { palette, now } = useApp();
  const [space, setSpace] = useState(0);
  const fit = space ? Math.max(1, Math.floor((space - 3) / EVENT_ROW_H)) : events.length;
  const shown = events.slice(0, fit);
  const cardHeight = events.length === 0 ? undefined : shown.length * EVENT_ROW_H + 3;

  return (
    <View style={styles.todayFill} onLayout={(e) => setSpace(e.nativeEvent.layout.height)}>
      <View style={[styles.todayCard, { height: cardHeight, borderColor: palette.line, backgroundColor: palette.surface }]}>
        {events.length === 0 ? <Text style={[styles.emptyText, { color: palette.sub }]}>예정된 일정이 없어요</Text> : null}
        {shown.map((e, i) => {
          const d = dday(e.date, now);
          const today = d === '오늘';
          const date = fromYmd(e.date);
          return (
            <Pressable
              key={e.id}
              onPress={() => router.push('/calendar')}
              accessibilityRole="button"
              accessibilityLabel={`${e.title}, ${d}, 달력 열기`}
              style={({ pressed }) => [
                styles.listRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: palette.line },
                pressed && styles.pressed,
              ]}>
              <View style={styles.listDate}>
                <Text style={[styles.listDay, { color: palette.text }]}>{date.getDate()}</Text>
                <Text style={[styles.listMonth, { color: palette.sub }]}>{date.getMonth() + 1}월</Text>
              </View>
              <View style={styles.fill}>
                <Text style={[styles.listTitle, { color: palette.text }]} numberOfLines={1}>
                  {e.title}
                </Text>
                <Text style={[styles.listKind, { color: palette.sub }]} numberOfLines={1}>
                  {e.kind === 'assessment' ? `수행평가 · ${e.subject ?? ''}` : '학사일정'}
                </Text>
              </View>
              <View style={[styles.ddayPill, { backgroundColor: today ? palette.accent : palette.tint }]}>
                <Text style={[styles.ddayText, { color: today ? palette.onAccent : palette.accentDeep }]}>{d}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const TODAY_ROW_H = 38;

function TodayClasses({
  title,
  rows,
  empty,
  onPress,
  /** false면 남은 공간을 재지 않고 모든 칸을 그대로 보여줘요. */
  fill = true,
}: {
  title: string;
  rows: { key: string; period: number; name: string; sub: string; state: 'done' | 'now' | 'todo' }[];
  empty: string;
  onPress: () => void;
  fill?: boolean;
}) {
  const { palette } = useApp();
  // 남은 공간을 재서 칸이 반쯤 잘리지 않게, 들어갈 수 있는 만큼만 보여주고
  // 카드 높이도 딱 그만큼으로 맞춰요. (카드 안에 빈 공간이 남지 않아요)
  const [space, setSpace] = useState(0);
  const fit = fill && space ? Math.max(1, Math.floor((space - 3) / TODAY_ROW_H)) : rows.length;
  const shown = rows.slice(0, fit);
  const cardHeight = rows.length === 0 ? undefined : shown.length * TODAY_ROW_H + 3;

  return (
    <View style={fill ? styles.todayWrap : undefined}>
      <Row title={title} action="시간표" onAction={onPress} />
      <View style={fill ? styles.todayFill : undefined} onLayout={(e) => setSpace(e.nativeEvent.layout.height)}>
        <View
          style={[styles.todayCard, { height: cardHeight, borderColor: palette.line, backgroundColor: palette.surface }]}>
          {rows.length === 0 ? <Text style={[styles.emptyText, { color: palette.sub }]}>{empty}</Text> : null}
          {shown.map((r, i) => (
            <View
              key={r.key}
              style={[
                styles.todayRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: palette.line },
                r.state === 'now' && { backgroundColor: palette.tint },
              ]}>
              <Text
                style={[
                  styles.todayPeriod,
                  { color: r.state === 'done' ? palette.sub : r.state === 'now' ? palette.accentDeep : palette.text },
                ]}>
                {r.period}
              </Text>
              <Text
                style={[styles.todayName, { color: r.state === 'done' ? palette.sub : palette.text }]}
                numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={[styles.todayTime, { color: palette.sub }]}>{r.sub}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** 맨 아래 3칸 바로가기 */
function Quick({ items }: { items: { icon: IconName; label: string; onPress: () => void }[] }) {
  const { palette } = useApp();
  const { compact } = useLayout();
  return (
    <View style={[styles.quickRow, compact && styles.quickRowCompact]}>
      {items.map((it) => (
        <Pressable
          key={it.label}
          onPress={it.onPress}
          accessibilityRole="button"
          accessibilityLabel={it.label}
          style={({ pressed }) => [
            styles.quick,
            compact && styles.quickCompact,
            { borderColor: palette.line, backgroundColor: palette.surface },
            pressed && styles.pressed,
          ]}>
          <View style={[styles.quickIcon, { backgroundColor: palette.tint }]}>
            <Icon name={it.icon} size={20} color={palette.accentDeep} />
          </View>
          <Text style={[styles.quickLabel, { color: palette.text }]} numberOfLines={1}>
            {it.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ================= 학생 홈 ================= */

type DotState = 'done' | 'now' | 'next' | 'todo';
type Hero = { line: string; big: string; states: DotState[]; nowLabel: string; nowSub: string; nextLabel: string; nextSub: string };

function buildStudentHero(status: SchoolStatus, day: Weekday | null): Hero {
  const week = TIMETABLES[STUDENT.cls];
  const today = day ? week[day] : [];
  const dots = (fn: (i: number) => DotState) => today.map((_, i) => fn(i));
  const none = { nowLabel: '-', nowSub: '수업 없음', nextLabel: '-', nextSub: '수업 없음' };

  switch (status.kind) {
    case 'weekend':
      return {
        line: '오늘은 쉬는 날이에요',
        big: '주말',
        states: [],
        ...none,
        nextLabel: '월 1교시',
        nextSub: week['월'][0],
      };
    case 'before':
      return {
        line: '곧 첫 수업이 시작돼요',
        big: `1교시 ${today[0]}`,
        states: dots((i) => (i === 0 ? 'next' : 'todo')),
        nowLabel: '등교 전',
        nowSub: `${BELL[0].start} 시작`,
        nextLabel: '1교시',
        nextSub: today[0],
      };
    case 'class': {
      const p = status.period;
      return {
        line: `${BELL[p - 1].end}에 끝나요`,
        big: `${p}교시 ${today[p - 1]}`,
        states: dots((i) => (i < p - 1 ? 'done' : i === p - 1 ? 'now' : 'todo')),
        nowLabel: `${p}교시`,
        nowSub: today[p - 1],
        nextLabel: today[p] ? `${p + 1}교시` : '끝',
        nextSub: today[p] ?? '오늘 수업 끝',
      };
    }
    case 'break':
    case 'lunch': {
      const n = status.next;
      return {
        line: status.kind === 'lunch' ? '점심시간이에요' : '쉬는 시간이에요',
        big: `다음 ${n}교시 ${today[n - 1]}`,
        states: dots((i) => (i < n - 1 ? 'done' : i === n - 1 ? 'next' : 'todo')),
        nowLabel: status.kind === 'lunch' ? '점심' : '쉬는 시간',
        nowSub: `${BELL[n - 1].start}까지`,
        nextLabel: `${n}교시`,
        nextSub: today[n - 1],
      };
    }
    case 'after':
      return {
        line: '오늘 수업이 모두 끝났어요',
        big: '수고했어요',
        states: dots(() => 'done'),
        nowLabel: '하교',
        nowSub: '수업 끝',
        nextLabel: '내일',
        nextSub: '시간표 보기',
      };
  }
}

function StudentHome() {
  const { palette, now, events, threads } = useApp();
  const { compact, tablet, twoColumn } = useLayout();
  const day = weekdayOf(now);
  const hero = buildStudentHero(schoolStatus(now), day);
  const upcoming = events.filter((e) => e.date >= toYmd(now)).sort((a, b) => a.date.localeCompare(b.date));
  const unread = threads.filter((t) => t.unreadStudent).length;
  const meal = day ? MEALS[day].lunch : null;
  const nowPeriod = currentPeriod(now);

  // 지금 교시부터 보여주고, 수업이 다 끝났으면 오늘 전체를 보여줘요.
  const allRows = (day ? TIMETABLES[STUDENT.cls][day] : []).map((subject, i) => ({
    key: `p${i}`,
    period: i + 1,
    name: subject,
    sub: `${BELL[i].start}–${BELL[i].end}`,
    state: (i + 1 === nowPeriod ? 'now' : i + 1 < nowPeriod ? 'done' : 'todo') as 'done' | 'now' | 'todo',
  }));
  const rest = allRows.filter((r) => r.period >= nowPeriod);
  const todayRows = rest.length ? rest : allRows;

  return (
    <HomeShell
      band={
        <>
          <BandTop title={`안녕하세요, ${STUDENT.name.slice(1)}님`} />
          <Text style={[styles.heroLine, { color: palette.onAccent }]}>{hero.line}</Text>
          <Text
            style={[styles.heroBig, { color: palette.onAccent }, compact && styles.heroBigCompact, tablet && styles.heroBigWide]}
            numberOfLines={1}>
            {hero.big}
          </Text>
          <PeriodDots states={hero.states} />
          <StatStrip
            items={[
              { label: '지금', value: hero.nowLabel, sub: hero.nowSub, onPress: () => router.push('/timetable') },
              { label: '다음', value: hero.nextLabel, sub: hero.nextSub, onPress: () => router.push('/timetable') },
              {
                label: '새 답변',
                value: `${unread}`,
                sub: unread ? '확인해보세요' : '모두 읽음',
                onPress: () => router.push('/community'),
              },
            ]}
          />
        </>
      }>
      {twoColumn ? (
        // 태블릿처럼 넓으면 두 칸으로 나눠서 가로 공간을 채워요.
        <View style={styles.cols}>
          <View style={styles.col}>
            <WideCard
              icon="meal"
              title="오늘 점심"
              right={meal ? `${meal.kcal}kcal` : undefined}
              body={meal ? meal.items.map((m) => m.name).join(', ') : '오늘은 급식이 없어요'}
              onPress={() => router.push('/meal')}
              label="오늘 점심 메뉴, 급식 화면 열기"
            />
            <TodayClasses
              title="오늘 시간표"
              empty={day ? '오늘은 수업이 없어요' : '주말이에요'}
              onPress={() => router.push('/timetable')}
              rows={allRows}
            />
          </View>
          <View style={styles.col}>
            <Row title="다가오는 일정" action="달력" onAction={() => router.push('/calendar')} />
            <EventList events={upcoming} />
          </View>
        </View>
      ) : tablet ? (
        // 세로 태블릿: 한 칸이지만 일정 목록이 남은 높이를 끝까지 채워요.
        <>
          <WideCard
            icon="meal"
            title="오늘 점심"
            right={meal ? `${meal.kcal}kcal` : undefined}
            body={meal ? meal.items.map((m) => m.name).join(', ') : '오늘은 급식이 없어요'}
            onPress={() => router.push('/meal')}
            label="오늘 점심 메뉴, 급식 화면 열기"
          />
          <TodayClasses
            title="오늘 시간표"
            empty={day ? '오늘은 수업이 없어요' : '주말이에요'}
            onPress={() => router.push('/timetable')}
            rows={allRows}
            fill={false}
          />
          <Row title="다가오는 일정" action="달력" onAction={() => router.push('/calendar')} />
          <EventList events={upcoming} />
        </>
      ) : (
        <>
          <WideCard
            icon="meal"
            title="오늘 점심"
            right={meal ? `${meal.kcal}kcal` : undefined}
            body={meal ? meal.items.map((m) => m.name).join(', ') : '오늘은 급식이 없어요'}
            onPress={() => router.push('/meal')}
            label="오늘 점심 메뉴, 급식 화면 열기"
          />
          <Row title="다가오는 일정" action="달력" onAction={() => router.push('/calendar')} />
          <EventCards events={upcoming} />
          {compact ? null : (
            <TodayClasses
              title="오늘 시간표"
              empty={day ? '오늘은 수업이 없어요' : '주말이에요'}
              onPress={() => router.push('/timetable')}
              rows={todayRows}
            />
          )}
        </>
      )}
      <Quick
        items={[
          { icon: 'chat', label: '질문하기', onPress: () => router.push('/community') },
          { icon: 'timetable', label: '시간표', onPress: () => router.push('/timetable') },
          { icon: 'meal', label: '이번 주 급식', onPress: () => router.push('/meal') },
        ]}
      />
    </HomeShell>
  );
}

/* ================= 선생님 홈 ================= */

function TeacherHome() {
  const { palette, now, events, threads } = useApp();
  const { compact, tablet, twoColumn } = useLayout();
  const day = weekdayOf(now);
  const pending = threads.filter(isPending);
  const upcoming = events.filter((e) => e.date >= toYmd(now)).sort((a, b) => a.date.localeCompare(b.date));
  const nowPeriod = currentPeriod(now);
  const meal = day ? MEALS[day].lunch : null;

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
  const nowClass = myClasses.find((c) => c.period === nowPeriod) ?? null;

  const allTeacherRows = myClasses.map((c) => ({
    key: `${c.cls}-${c.period}`,
    period: c.period,
    name: `${classLabel(c.cls)} ${c.subject}`,
    sub: `${BELL[c.period - 1].start}–${BELL[c.period - 1].end}`,
    state: (c.period === nowPeriod ? 'now' : c.period < nowPeriod ? 'done' : 'todo') as 'done' | 'now' | 'todo',
  }));
  const teacherRest = allTeacherRows.filter((r) => r.period >= nowPeriod);
  const teacherRows = teacherRest.length ? teacherRest : allTeacherRows;

  const oldest = pending[pending.length - 1];
  const oldestText = oldest
    ? `${oldest.student.name} 학생 · ${oldest.messages[oldest.messages.length - 1].text}`
    : '새로 온 쪽지가 없어요';

  return (
    <HomeShell
      band={
        <>
          <BandTop title={`${TEACHER.name} 선생님`} />
          <Text style={[styles.heroLine, { color: palette.onAccent }]}>
            {pending.length ? '답변을 기다리는 쪽지가 있어요' : '모든 쪽지에 답했어요'}
          </Text>
          <Text
            style={[styles.heroBig, { color: palette.onAccent }, compact && styles.heroBigCompact, tablet && styles.heroBigWide]}
            numberOfLines={1}>
            {pending.length ? `쪽지 ${pending.length}개` : '쪽지함 비움'}
          </Text>
          <StatStrip
            items={[
              {
                label: '오늘 수업',
                value: `${myClasses.length}`,
                sub: myClasses.length ? `${myClasses[0].period}교시부터` : '수업 없음',
                onPress: () => router.push('/timetable'),
              },
              {
                label: nowClass ? '지금' : '다음 수업',
                value: nextClass ? `${nextClass.period}교시` : '-',
                sub: nextClass ? classLabel(nextClass.cls) : '오늘 수업 끝',
                onPress: () => router.push('/timetable'),
              },
              {
                label: '답변 대기',
                value: `${pending.length}`,
                sub: pending.length ? '쪽지함 열기' : '모두 답변함',
                onPress: () => router.push('/community'),
              },
            ]}
          />
        </>
      }>
      {twoColumn ? (
        <View style={styles.cols}>
          <View style={styles.col}>
            <WideCard
              icon="inbox"
              title={pending.length ? '가장 오래 기다린 쪽지' : '쪽지함'}
              right={pending.length ? pending[pending.length - 1].subject : undefined}
              body={oldestText}
              onPress={() => router.push('/community')}
              label="쪽지함 열기"
            />
            <TodayClasses
              title="오늘 내 수업"
              empty="오늘은 수업이 없어요"
              onPress={() => router.push('/timetable')}
              rows={allTeacherRows}
            />
          </View>
          <View style={styles.col}>
            <Row
              title="다가오는 일정"
              action="일정 추가"
              onAction={() => router.push({ pathname: '/add-event', params: { date: toYmd(now) } })}
            />
            <EventList events={upcoming} />
          </View>
        </View>
      ) : tablet ? (
        <>
          <WideCard
            icon="inbox"
            title={pending.length ? '가장 오래 기다린 쪽지' : '쪽지함'}
            right={pending.length ? pending[pending.length - 1].subject : undefined}
            body={oldestText}
            onPress={() => router.push('/community')}
            label="쪽지함 열기"
          />
          <TodayClasses
            title="오늘 내 수업"
            empty="오늘은 수업이 없어요"
            onPress={() => router.push('/timetable')}
            rows={allTeacherRows}
            fill={false}
          />
          <Row
            title="다가오는 일정"
            action="일정 추가"
            onAction={() => router.push({ pathname: '/add-event', params: { date: toYmd(now) } })}
          />
          <EventList events={upcoming} />
        </>
      ) : (
        <>
          <WideCard
            icon="inbox"
            title={pending.length ? '가장 오래 기다린 쪽지' : '쪽지함'}
            right={pending.length ? pending[pending.length - 1].subject : undefined}
            body={oldestText}
            onPress={() => router.push('/community')}
            label="쪽지함 열기"
          />
          <Row
            title="다가오는 일정"
            action="일정 추가"
            onAction={() => router.push({ pathname: '/add-event', params: { date: toYmd(now) } })}
          />
          <EventCards events={upcoming} />
          {compact ? null : (
            <TodayClasses
              title="오늘 내 수업"
              empty="오늘은 수업이 없어요"
              onPress={() => router.push('/timetable')}
              rows={teacherRows}
            />
          )}
        </>
      )}
      <Quick
        items={[
          { icon: 'plus', label: '일정 추가', onPress: () => router.push({ pathname: '/add-event', params: { date: toYmd(now) } }) },
          { icon: 'inbox', label: '쪽지함', onPress: () => router.push('/community') },
          { icon: 'meal', label: meal ? `급식 ${meal.kcal}kcal` : '급식', onPress: () => router.push('/meal') },
        ]}
      />
    </HomeShell>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },

  shell: { flex: 1 },
  shellScroll: { flexGrow: 1, paddingBottom: 12 },
  band: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 15 },
  bandCompact: { paddingBottom: 13, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  bandInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20 },
  body: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14 },
  bodyCompact: { paddingTop: 12 },
  bodyAuto: { flex: 0 },
  cols: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 16 },
  col: { flex: 1, minHeight: 0 },

  bandTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 11 },
  bandTopCompact: { paddingBottom: 9 },
  bandDate: { fontSize: 14, fontWeight: '700', opacity: 0.85 },
  bandName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginTop: 2 },
  bandNameCompact: { fontSize: 19 },
  bandNameWide: { fontSize: 26 },

  heroLine: { fontSize: 15, fontWeight: '700', opacity: 0.9 },
  heroBig: { fontSize: 34, lineHeight: 41, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  heroBigCompact: { fontSize: 26, lineHeight: 33 },
  heroBigWide: { fontSize: 44, lineHeight: 54 },

  dots: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, height: 20 },
  dotsCompact: { marginTop: 7, height: 16, gap: 6 },
  dot: { width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
  dotNow: { width: 20, height: 20, borderRadius: 10, borderWidth: 4 },

  strip: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, marginTop: 13, overflow: 'hidden' },
  stripCompact: { marginTop: 10, borderRadius: 17 },
  stripLine: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 1, zIndex: 1 },
  stripItem: { paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 1 },
  stripItemCompact: { paddingVertical: 8 },
  stripLabel: { fontSize: 12, fontWeight: '700', opacity: 0.85 },
  stripValue: { fontSize: 20, fontWeight: '800' },
  stripValueCompact: { fontSize: 18 },
  stripSub: { fontSize: 12, fontWeight: '600', opacity: 0.8 },

  wide: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 22, padding: 14 },
  wideIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  wideHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wideTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  wideTitleWide: { fontSize: 18 },
  wideRight: { fontSize: 13, fontWeight: '700' },
  wideBody: { fontSize: 14, lineHeight: 19, marginTop: 3 },

  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, marginBottom: 9 },
  rowHeadCompact: { marginTop: 10, marginBottom: 7 },
  rowTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  rowTitleWide: { fontSize: 20 },
  rowAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rowActionText: { fontSize: 14, fontWeight: '700' },

  cardScroll: { flexGrow: 0, flexShrink: 0 },
  cardRow: { gap: 10, paddingRight: 20 },
  eventCard: { width: 132, height: 104, borderWidth: 1.5, borderRadius: 20, padding: 13, justifyContent: 'space-between' },
  eventCardCompact: { height: 92, padding: 10 },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventDate: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  ddayPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  ddayText: { fontSize: 12, fontWeight: '800' },
  eventTitle: { fontSize: 15, fontWeight: '800', lineHeight: 19, flex: 1, marginTop: 6 },
  eventKind: { fontSize: 12, fontWeight: '600' },

  emptyCard: { height: 104, flexShrink: 0, borderWidth: 1.5, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center', paddingVertical: 18 },

  todayWrap: { flex: 1, minHeight: 0 },
  todayFill: { flex: 1, minHeight: 0 },
  todayCard: { borderWidth: 1.5, borderRadius: 20, overflow: 'hidden' },
  todayRow: { height: TODAY_ROW_H, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  todayPeriod: { width: 18, fontSize: 16, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  todayName: { flex: 1, fontSize: 15, fontWeight: '700' },
  todayTime: { fontSize: 13, fontVariant: ['tabular-nums'] },

  listRow: { height: EVENT_ROW_H, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  listDate: { width: 34, alignItems: 'center' },
  listDay: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 23 },
  listMonth: { fontSize: 11, fontWeight: '700' },
  listTitle: { fontSize: 15, fontWeight: '700' },
  listKind: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  quickRow: { flexShrink: 0, flexDirection: 'row', gap: 10, marginTop: 'auto', paddingTop: 12, paddingBottom: 4 },
  quickRowCompact: { paddingTop: 10, paddingBottom: 2 },
  quick: { flex: 1, borderWidth: 1.5, borderRadius: 20, paddingVertical: 14, alignItems: 'center', gap: 8 },
  quickCompact: { paddingVertical: 10, gap: 6 },
  quickIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '700' },
});
