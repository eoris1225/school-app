import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DayCell, MAX_BANDS } from '@/components/day-cell';
import { Reveal } from '@/components/motion';
import { EventRow } from '@/components/rows';
import { Text } from '@/components/text';
import { Button, Chip, Divider, Empty, ErrorNote, Field, Header, IconButton, Loading, Screen, SectionTitle } from '@/components/ui';
import { subjectTone } from '@/constants/tones';
import { type EventKind, type SchoolEvent } from '@/data/mock';
import { getEvents } from '@/lib/api';
import { useRemote } from '@/lib/use-remote';
import { useApp } from '@/lib/app-state';
import { DOW, formatDay, fromYmd, toYmd } from '@/lib/time';

/**
 * 'mine' 은 선생님만 써요. "내가 올린 일정"이에요.
 *
 * 학교 전체 일정에 섞여 있으면 자기가 뭘 올렸는지 찾을 수가 없어요. 학기 초에
 * 수행평가를 여러 개 잡아두고 나면 더 그래요.
 */
type Filter = 'all' | EventKind | 'mine';

export default function CalendarScreen() {
  const { palette, role, now, me, events, removeEvent, canDelete, school, myEvents, addMyEvent, removeMyEvent } =
    useApp();
  const teacher = role === 'teacher';

  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(toYmd(now));
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const addMine = () => {
    if (!draft.trim()) return;
    addMyEvent(selected, draft);
    setDraft('');
  };

  // 학사일정은 NEIS에서 그 달치를 받아와요. 수행평가는 선생님이 등록한 것이라
  // 앱이 들고 있어요. 둘을 합쳐서 한 달력에 보여줘요.
  const monthStart = toYmd(new Date(cursor.y, cursor.m, 1));
  const monthEnd = toYmd(new Date(cursor.y, cursor.m + 1, 0));
  const remote = useRemote(`schedule:${school?.code}:${monthStart}`, () =>
    getEvents(monthStart, monthEnd, school ?? undefined),
  );

  // 탭 화면은 학교를 고른 뒤에만 열려요. 그래서 school은 항상 있어요.
  const myGrade = school?.grade ?? 1;
  const academic: SchoolEvent[] = (remote.data ?? [])
    // 선생님은 전 학년을 보고, 학생은 자기 학년 것만 봐요.
    .filter((e) => teacher || e.grades.includes(myGrade))
    .map((e) => ({
      id: `neis:${e.date}:${e.title}`,
      date: e.date,
      title: e.title,
      kind: 'academic' as const,
      // 전 학년이면 빈 배열로 둬요. '1·2·3학년' 보다 '전체'가 읽기 쉬워요.
      grades: e.grades.length === 3 ? [] : e.grades,
      classes: [],
    }));

  // 나만 보는 일정도 같이 보여줘요. 아무에게도 안 올라가고 이 기기에만 있어요.
  const personal: SchoolEvent[] = myEvents.map((e) => ({
    id: e.id,
    date: e.date,
    title: e.title,
    kind: 'personal' as const,
    grades: [],
    classes: [],
  }));

  const all = [...academic, ...events.filter((e) => e.kind === 'assessment'), ...personal];
  const shown = all.filter((e) =>
    filter === 'all' ? true : filter === 'mine' ? e.by?.id === me?.id : e.kind === filter,
  );
  const byDate = new Map<string, SchoolEvent[]>();
  shown.forEach((e) => byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]));

  // 일정 종류를 색 이름으로 바꿔요. 수행평가는 과목 색, 내 일정은 따로,
  // 나머지는 학사일정 색이에요.
  const toneNameOf = (e: SchoolEvent) =>
    e.kind === 'assessment'
      ? (e.subject ?? '수행평가')
      : e.kind === 'personal'
        ? '내 일정'
        : '학사일정';

  /**
   * 날짜 네모를 어떻게 칠할지 정해요.
   *
   * 일정 하나에 줄 하나예요. 수행평가가 셋이면 줄도 셋이에요.
   * 예전에는 종류별로 묶어서 세 색까지만 썼는데, 그러면 바쁜 날과
   * 하나뿐인 날이 똑같아 보였어요. 개수가 보여야 "이 날 큰일이네"가 읽혀요.
   *
   * 여덟 줄까지만 그려요. 38픽셀 네모에 아홉 줄을 그으면 줄이 아니라
   * 얼룩이에요. 더 있으면 오른쪽 위 숫자가 알려줘요.
   *
   * 수행평가는 과목 색이에요. 국어 수행평가는 국어 색, 수학은 수학 색이라
   * 무슨 과목이 몰렸는지 표만 봐도 보여요.
   */
  const dayTones = (list: SchoolEvent[]) =>
    list.slice(0, MAX_BANDS).map((e) => subjectTone(toneNameOf(e), palette.scheme));

  const dayEvents = shown.filter((e) => e.date === selected);

  const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const moveMonth = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    // 달을 넘기면 아래 목록도 그 달로 같이 옮겨요. 옮긴 달이 이번 달이면 오늘을 골라요.
    const hasToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    setSelected(toYmd(hasToday ? now : d));
    setConfirmId(null);
  };

  const openAdd = () => router.push({ pathname: '/add-event', params: { date: selected } });

  // 종이 달력처럼 일요일은 빨강, 토요일은 파랑으로 보여줘요.
  const weekendColor = (dow: number, weekday: string) =>
    dow === 0 ? palette.sunday : dow === 6 ? palette.saturday : weekday;

  return (
    <Screen>
      <Header
        subtitle="학사일정과 수행평가"
        title="달력"
        right={teacher ? <IconButton icon="plus" label="일정 추가" filled onPress={openAdd} /> : null}
      />

      <View style={styles.monthRow}>
        <Text style={[styles.monthText, { color: palette.text }]} accessibilityRole="header">
          {cursor.y}년 {cursor.m + 1}월
        </Text>
        <View style={styles.monthNav}>
          <IconButton icon="back" label="이전 달" onPress={() => moveMonth(-1)} />
          <IconButton icon="next" label="다음 달" onPress={() => moveMonth(1)} />
        </View>
      </View>

      <View style={styles.filters}>
        <Chip label="전체" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="학사일정" selected={filter === 'academic'} onPress={() => setFilter('academic')} />
        <Chip label="수행평가" selected={filter === 'assessment'} onPress={() => setFilter('assessment')} />
        <Chip label="내 일정" selected={filter === 'personal'} onPress={() => setFilter('personal')} />
        {/* 선생님만요. 학생은 올릴 수가 없어서 늘 비어 있어요. */}
        {teacher ? (
          <Chip label="내가 올림" selected={filter === 'mine'} onPress={() => setFilter('mine')} />
        ) : null}
      </View>

      <View style={[styles.calendarCard, { backgroundColor: palette.surface }]}>
        <View style={styles.weekRow}>
          {DOW.map((d, i) => (
            <Text key={d} style={[styles.dow, { color: weekendColor(i, palette.sub) }]}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={styles.cell} />;
              const ymd = toYmd(new Date(cursor.y, cursor.m, day));
              const isToday = ymd === toYmd(now);
              const isSelected = ymd === selected;
              const marks = byDate.get(ymd) ?? [];
              return (
                <Pressable
                  key={di}
                  onPress={() => {
                    setSelected(ymd);
                    setConfirmId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${cursor.m + 1}월 ${day}일${isToday ? ', 오늘' : ''}${marks.length ? `, 일정 ${marks.length}개` : ''}`}
                  style={styles.cell}>
                  <DayCell
                    day={day}
                    tones={dayTones(marks)}
                    today={isToday}
                    selected={isSelected}
                    count={marks.length}
                    textColor={weekendColor(di, palette.text)}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
        {/*
          범례예요. 수행평가만 색이 하나가 아니에요. 과목 색을 쓰거든요.
          그래서 한 칸이 아니라 여러 색을 이어 붙여서 "과목 색"이라고 알려줘요.
          예전에는 보라색 한 칸이었는데, 실제로는 국어면 분홍이라 거짓말이었어요.
        */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendBar, { backgroundColor: subjectTone('학사일정', palette.scheme).fg }]}
            />
            <Text style={[styles.legendText, { color: palette.sub }]}>학사일정</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendBar}>
              {['국어', '수학', '과학', '체육'].map((s) => (
                <View
                  key={s}
                  style={[styles.legendPart, { backgroundColor: subjectTone(s, palette.scheme).fg }]}
                />
              ))}
            </View>
            <Text style={[styles.legendText, { color: palette.sub }]}>수행평가는 과목 색</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendBar, { backgroundColor: subjectTone('내 일정', palette.scheme).fg }]}
            />
            <Text style={[styles.legendText, { color: palette.sub }]}>내 일정</Text>
          </View>
        </View>
      </View>

      <SectionTitle title={formatDay(fromYmd(selected))} />
      <View>
        {remote.loading ? <Loading text="학사일정을 불러오는 중이에요" /> : null}
        {remote.error ? (
          <ErrorNote text={remote.error} onRetry={remote.retryable ? remote.retry : undefined} />
        ) : null}
        {!remote.loading && !remote.error && dayEvents.length === 0 ? (
          <Empty art="calendar" text="이날은 일정이 없어요" />
        ) : null}
        {dayEvents.map((e, i) => (
          // key에 고른 날짜를 섞어요. 날짜를 바꾸면 줄이 새로 그려지면서
          // 다시 올라와요. 안 그러면 내용만 조용히 갈려서 바뀐 줄 몰라요.
          <Reveal key={`${selected}:${e.id}`} delay={i * 50} distance={10}>
            {i > 0 ? <Divider /> : null}
            {/* 지울 수 있는 사람에게만 지우기가 나와요.
                수행평가는 그 과목 선생님만이에요. 규칙은 app-state의 canDelete에 있어요. */}
            <EventRow
              event={e}
              showDday={!teacher}
              onDelete={
                e.kind === 'personal'
                  ? () => removeMyEvent(e.id)
                  : canDelete(e)
                    ? () => setConfirmId(e.id)
                    : undefined
              }
            />
            {confirmId === e.id ? (
              <View style={[styles.confirm, { backgroundColor: palette.tint }]}>
                <Text style={[styles.confirmText, { color: palette.text }]}>
                  이 일정을 지울까요? 학생 달력에서도 사라져요.
                </Text>
                <View style={styles.confirmButtons}>
                  <View style={styles.fill}>
                    <Button label="취소" variant="secondary" onPress={() => setConfirmId(null)} />
                  </View>
                  <View style={styles.fill}>
                    <Button
                      label="지우기"
                      onPress={async () => {
                        const problem = await removeEvent(e.id);
                        setConfirmId(null);
                        setFailed(problem);
                      }}
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </Reveal>
        ))}
      </View>
      {failed ? <ErrorNote text={failed} /> : null}

      {/* 나만 보는 일정. 학원, 시험공부, 친구 약속 같은 것들요. */}
      <SectionTitle title="내 일정 추가" />
      <Text style={[styles.mineHelp, { color: palette.sub }]}>
        나만 보여요. 다른 학생이나 선생님에게는 안 보여요.
      </Text>
      <View style={styles.mineRow}>
        <View style={styles.fill}>
          <Field
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addMine}
            placeholder={`${formatDay(fromYmd(selected))}에 할 일`}
            accessibilityLabel="내 일정 제목"
            style={styles.mineInput}
          />
        </View>
        <IconButton icon="plus" label="내 일정 추가" filled disabled={!draft.trim()} onPress={addMine} />
      </View>

      {teacher ? <Button label="이 날짜에 일정 추가" icon="plus" variant="secondary" onPress={openAdd} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthText: { fontSize: 18, fontWeight: '800' },
  monthNav: { flexDirection: 'row', gap: 8 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 12 },

  calendarCard: { borderRadius: 22, paddingHorizontal: 8, paddingVertical: 12 },
  weekRow: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', paddingBottom: 4 },
  cell: { flex: 1, height: 54, alignItems: 'center', paddingTop: 2 },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  dayTextBold: { fontWeight: '800' },
  marks: { marginTop: 5, height: 4, justifyContent: 'center' },
  bar: { flexDirection: 'row', width: 22, height: 4, borderRadius: 2, overflow: 'hidden' },
  barPart: { flex: 1, height: 4 },
  mineHelp: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  mineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  mineInput: { borderRadius: 16, height: 48, paddingHorizontal: 16 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBar: { flexDirection: 'row', width: 16, height: 4, borderRadius: 2, overflow: 'hidden' },
  legendPart: { flex: 1 },
  legendText: { fontSize: 12, fontWeight: '600' },

  confirm: { borderRadius: 16, padding: 12, marginBottom: 12, gap: 12 },
  confirmText: { fontSize: 13, fontWeight: '600', lineHeight: 21 },
  confirmButtons: { flexDirection: 'row', gap: 8 },
});
