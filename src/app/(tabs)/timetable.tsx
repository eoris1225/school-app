import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { subjectIcon } from '@/components/icon';
import { Tap } from '@/components/motion';
import { Chip, ChipRow, Divider, Empty, ErrorNote, Header, IconChip, Loading, Screen, Segmented, Tag } from '@/components/ui';
import {
  BELL,
  CLASSES,
  classLabel,
  classOf,
  gradeOf,
  LUNCH,
  STUDENT,
  TEACHER,
  teacherFor,
  WEEKDAYS,
  type ClassId,
  type Weekday,
} from '@/data/mock';
import { getLessons } from '@/lib/api';
import { byWeekday } from '@/lib/timetable';
import { useRemote } from '@/lib/use-remote';
import { subjectTone } from '@/constants/tones';
import { useApp } from '@/lib/app-state';
import { holidayName, readSubject } from '@/lib/subject';
import { currentPeriod, weekDates, weekdayOf } from '@/lib/time';


export default function TimetableScreen() {
  const { palette, role, now } = useApp();
  const teacher = role === 'teacher';
  const today = weekdayOf(now);
  const nowPeriod = currentPeriod(now);

  const [cls, setCls] = useState<ClassId>(teacher ? TEACHER.homeroom : STUDENT.cls);
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [day, setDay] = useState<Weekday>(today ?? '월');

  // 한 주치를 한 번에 받아둬요. 요일이나 하루/한 주를 눌러도 다시 부르지 않아요.
  const dates = weekDates(now);
  const remote = useRemote(`timetable:${cls}:${dates.월}`, () =>
    getLessons(gradeOf(cls), classOf(cls), dates.월, dates.금),
  );

  const week = byWeekday(remote.data ?? [], dates);
  const holiday = holidayName(week[day].filter(Boolean));

  return (
    <Screen>
      <Header subtitle={classLabel(cls)} title="시간표" />

      {teacher ? (
        <View style={styles.classPicker}>
          <ChipRow>
            {CLASSES.map((c) => (
              <Chip key={c} label={classLabel(c)} selected={c === cls} onPress={() => setCls(c)} />
            ))}
          </ChipRow>
        </View>
      ) : null}

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'day', label: '하루' },
          { value: 'week', label: '한 주' },
        ]}
      />

      {mode === 'day' ? (
        <>
          <View style={styles.dayTabs} accessibilityRole="tablist">
            {WEEKDAYS.map((d) => {
              const selected = d === day;
              return (
                <Tap
                  key={d}
                  onPress={() => setDay(d)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${d}요일${d === today ? ', 오늘' : ''}`}
                  depth={0.05}
                  style={[
                    styles.dayTab,
                    selected && { backgroundColor: palette.accent },
                    !selected && d === today && { backgroundColor: palette.tint },
                  ]}>
                  <Text style={[styles.dayTabText, { color: selected ? palette.onAccent : palette.text }]}>{d}</Text>
                </Tap>
              );
            })}
          </View>

          <View>
            {/* 추석 같은 날은 NEIS가 1교시부터 끝까지 같은 말로 채워서 줘요.
                그대로 그리면 "1교시 추석, 2교시 추석..." 이 되니 한 줄로 보여줘요. */}
            {remote.loading ? (
              <Loading text="시간표를 불러오는 중이에요" />
            ) : remote.error ? (
              <ErrorNote text={remote.error} onRetry={remote.retryable ? remote.retry : undefined} />
            ) : holiday ? (
              <Empty text={`${day}요일은 ${holiday}이라 수업이 없어요`} />
            ) : week[day].filter(Boolean).length === 0 ? (
              <Empty text={`${day}요일은 등록된 시간표가 없어요`} />
            ) : (
            week[day].map((raw, i, arr) => {
              if (!raw) return null;
              const subject = readSubject(raw);
              const period = i + 1;
              const isNow = day === today && period === nowPeriod;
              const bell = BELL[i];
              const who = teacherFor(subject.name, cls);
              const st = subjectTone(raw, palette.scheme);
              return (
                <View key={period}>
                  {period === LUNCH.afterPeriod + 1 ? (
                    <View style={[styles.lunch, { borderColor: palette.line }]}>
                      <Text style={[styles.lunchText, { color: palette.sub }]}>
                        점심시간 {LUNCH.start}부터 {LUNCH.end}까지
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={[styles.periodRow, isNow && { backgroundColor: st.bg }]}
                    accessible
                    accessibilityLabel={`${period}교시 ${subject.name}${subject.makeup ? ', 보강' : ''}${who ? `, ${who}` : ''}, ${bell.start}부터 ${bell.end}까지${isNow ? ', 지금 수업 중' : ''}`}>
                    <IconChip icon={subjectIcon(raw)} subject={raw} size={42} />
                    <View style={styles.fill}>
                      <View style={styles.subjectRow}>
                        <Text style={[styles.periodTag, { color: st.fg }]}>{period}교시</Text>
                        <Text style={[styles.subject, { color: palette.text }]}>{subject.name}</Text>
                        {subject.makeup ? <Tag label="보강" /> : null}
                      </View>
                      <View style={styles.metaRow}>
                        <Text numeric style={[styles.periodMeta, { color: palette.sub }]}>
                          {bell.start}–{bell.end}
                        </Text>
                        {who ? <Text style={[styles.periodMeta, { color: palette.sub }]}>{who}</Text> : null}
                      </View>
                    </View>
                    {isNow ? <Tag label="지금" tone="solid" /> : null}
                  </View>
                  {i < arr.length - 1 && period !== LUNCH.afterPeriod ? <Divider /> : null}
                </View>
              );
            })
            )}
          </View>
        </>
      ) : remote.loading ? (
        <Loading text="시간표를 불러오는 중이에요" />
      ) : remote.error ? (
        <ErrorNote text={remote.error} onRetry={remote.retryable ? remote.retry : undefined} />
      ) : (
        <View>
          <View style={styles.weekRow}>
            <View style={styles.weekPeriodCell} />
            {WEEKDAYS.map((d) => (
              <View key={d} style={[styles.weekHead, d === today && { backgroundColor: palette.tint }]}>
                <Text style={[styles.weekHeadText, { color: d === today ? palette.accentDeep : palette.sub }]}>{d}</Text>
              </View>
            ))}
          </View>
          {BELL.map((bell, i) => (
            <View key={bell.period}>
              {bell.period === LUNCH.afterPeriod + 1 ? (
                <View style={[styles.weekLunch, { borderTopColor: palette.line }]}>
                  <Text style={[styles.weekLunchText, { color: palette.sub }]}>점심시간</Text>
                </View>
              ) : null}
              <View style={styles.weekRow}>
                <View style={styles.weekPeriodCell}>
                  <Text numeric style={[styles.weekPeriod, { color: palette.sub }]}>
                    {bell.period}
                  </Text>
                </View>
                {WEEKDAYS.map((d) => {
                  const subject = week[d][i];
                  // 그 반에 그 교시가 없으면 빈 칸으로 둬요.
                  if (!subject) return <View key={d} style={styles.weekCellEmpty} />;
                  const isNow = d === today && bell.period === nowPeriod;
                  const st = subjectTone(subject, palette.scheme);
                  return (
                    <View
                      key={d}
                      style={[
                        styles.weekCell,
                        { backgroundColor: st.bg },
                        isNow && { backgroundColor: palette.accent, borderColor: palette.accent },
                      ]}
                      accessible
                      accessibilityLabel={`${d}요일 ${bell.period}교시 ${subject}${isNow ? ', 지금 수업 중' : ''}`}>
                      <Text
                        style={[styles.weekCellText, { color: isNow ? palette.onAccent : st.fg }]}
                        numberOfLines={1}>
                        {readSubject(subject).short}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  classPicker: { marginBottom: 12 },

  dayTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dayTab: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayTabText: { fontSize: 15, fontWeight: '800' },

  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, marginHorizontal: -12, borderRadius: 16 },
  subjectRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  periodTag: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  subject: { fontSize: 15, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  periodMeta: { fontSize: 12, fontVariant: ['tabular-nums'] },
  lunch: { borderTopWidth: 1, borderBottomWidth: 1, borderStyle: 'dashed', paddingVertical: 12, marginVertical: 8 },
  lunchText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  weekRow: { flexDirection: 'row' },
  weekPeriodCell: { width: 26, alignItems: 'center', justifyContent: 'center' },
  weekPeriod: { fontSize: 12, fontWeight: '800' },
  weekHead: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 1, borderRadius: 10 },
  weekHeadText: { fontSize: 13, fontWeight: '800' },
  weekCellEmpty: { flex: 1, height: 50, margin: 2 },
  weekCell: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', margin: 2, borderRadius: 12 },
  weekCellText: { fontSize: 12, fontWeight: '700' },
  weekLunch: { borderTopWidth: 1.5, borderStyle: 'dashed', marginTop: 4, paddingTop: 4 },
  weekLunchText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
