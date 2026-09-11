import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EventRow } from '@/components/rows';
import { Text } from '@/components/text';
import { Button, Chip, Divider, Empty, ErrorNote, Header, IconButton, Loading, Screen, SectionTitle } from '@/components/ui';
import { subjectTone } from '@/constants/tones';
import { gradeOf, STUDENT, TEACHER, type EventKind, type SchoolEvent } from '@/data/mock';
import { getEvents } from '@/lib/api';
import { useRemote } from '@/lib/use-remote';
import { useApp } from '@/lib/app-state';
import { DOW, formatDay, fromYmd, toYmd } from '@/lib/time';

type Filter = 'all' | EventKind;

export default function CalendarScreen() {
  const { palette, role, now, events, removeEvent, school } = useApp();
  const teacher = role === 'teacher';

  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(toYmd(now));
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // 학사일정은 NEIS에서 그 달치를 받아와요. 수행평가는 선생님이 등록한 것이라
  // 앱이 들고 있어요. 둘을 합쳐서 한 달력에 보여줘요.
  const monthStart = toYmd(new Date(cursor.y, cursor.m, 1));
  const monthEnd = toYmd(new Date(cursor.y, cursor.m + 1, 0));
  const remote = useRemote(`schedule:${school?.code}:${monthStart}`, () =>
    getEvents(monthStart, monthEnd, school ?? undefined),
  );

  const myGrade = school ? school.grade : gradeOf(teacher ? TEACHER.homeroom : STUDENT.cls);
  const academic: SchoolEvent[] = (remote.data ?? [])
    // 선생님은 전 학년을 보고, 학생은 자기 학년 것만 봐요.
    .filter((e) => teacher || e.grades.includes(myGrade))
    .map((e) => ({
      id: `neis:${e.date}:${e.title}`,
      date: e.date,
      title: e.title,
      kind: 'academic' as const,
      target: e.grades.length === 3 ? '전체' : `${e.grades.join('·')}학년`,
    }));

  const all = [...academic, ...events.filter((e) => e.kind === 'assessment')];
  const shown = all.filter((e) => filter === 'all' || e.kind === filter);
  const byDate = new Map<string, SchoolEvent[]>();
  shown.forEach((e) => byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]));

  // 날짜 밑 점은 그 일정의 과목 색으로 찍어요.
  const markColor = (e: SchoolEvent) =>
    subjectTone(e.kind === 'assessment' ? (e.subject ?? '수행평가') : '학사일정', palette.scheme).fg;
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
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && !isToday && { backgroundColor: palette.tint, borderColor: palette.accent },
                      isToday && { backgroundColor: palette.accent, borderColor: palette.accent },
                    ]}>
                    <Text
                      numeric
                      style={[
                        styles.dayText,
                        {
                          color: isToday
                            ? palette.onAccent
                            : isSelected
                              ? palette.accentDeep
                              : weekendColor(di, palette.text),
                        },
                        (isToday || isSelected) && styles.dayTextBold,
                      ]}>
                      {day}
                    </Text>
                  </View>
                  <View style={styles.marks}>
                    {marks.slice(0, 3).map((e, i) => (
                      <View key={i} style={[styles.mark, { backgroundColor: markColor(e) }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View style={styles.legend}>
          <View style={[styles.mark, { backgroundColor: subjectTone('학사일정', palette.scheme).fg }]} />
          <Text style={[styles.legendText, { color: palette.sub }]}>학사일정</Text>
          <Text style={[styles.legendText, { color: palette.sub, marginLeft: 12 }]}>수행평가는 과목 색으로 표시돼요</Text>
        </View>
      </View>

      <SectionTitle title={formatDay(fromYmd(selected))} />
      <View>
        {remote.loading ? <Loading text="학사일정을 불러오는 중이에요" /> : null}
        {remote.error ? (
          <ErrorNote text={remote.error} onRetry={remote.retryable ? remote.retry : undefined} />
        ) : null}
        {!remote.loading && !remote.error && dayEvents.length === 0 ? (
          <Empty text="이날은 일정이 없어요" />
        ) : null}
        {dayEvents.map((e, i) => (
          <View key={e.id}>
            {i > 0 ? <Divider /> : null}
            {/* NEIS에서 온 학사일정은 우리가 만든 게 아니라 지울 수 없어요.
                선생님이 직접 등록한 수행평가만 지우기가 나와요. */}
            <EventRow
              event={e}
              showDday={!teacher}
              onDelete={teacher && e.kind === 'assessment' ? () => setConfirmId(e.id) : undefined}
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
                      onPress={() => {
                        removeEvent(e.id);
                        setConfirmId(null);
                      }}
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ))}
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
  marks: { flexDirection: 'row', gap: 4, marginTop: 4, height: 7 },
  mark: { width: 7, height: 7, borderRadius: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 8 },
  legendText: { fontSize: 12, fontWeight: '600' },

  confirm: { borderRadius: 16, padding: 12, marginBottom: 12, gap: 12 },
  confirmText: { fontSize: 13, fontWeight: '600', lineHeight: 21 },
  confirmButtons: { flexDirection: 'row', gap: 8 },
});
