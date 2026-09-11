import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { subjectIcon } from '@/components/icon';
import { Card, Chip, ChipRow, Header, IconChip, Screen, Segmented, Tag } from '@/components/ui';
import {
  BELL,
  CLASSES,
  classLabel,
  LUNCH,
  STUDENT,
  TEACHER,
  TIMETABLES,
  teacherFor,
  WEEKDAYS,
  type ClassId,
  type Weekday,
} from '@/data/mock';
import { subjectTone } from '@/constants/tones';
import { useApp } from '@/lib/app-state';
import { currentPeriod, weekdayOf } from '@/lib/time';

/** 한 주 보기 칸이 좁아서 긴 과목 이름은 줄여요. */
const SHORT: Record<string, string> = { 자율활동: '자율', 동아리: '동아리', 한국사: '한국사' };

/** 지정해둔 줄임말이 없으면 네 글자 이상만 앞 두 글자로 줄여요. */
const shortSubject = (name: string) => SHORT[name] ?? (name.length > 3 ? name.slice(0, 2) : name);

export default function TimetableScreen() {
  const { palette, role, now } = useApp();
  const teacher = role === 'teacher';
  const today = weekdayOf(now);
  const nowPeriod = currentPeriod(now);

  const [cls, setCls] = useState<ClassId>(teacher ? TEACHER.homeroom : STUDENT.cls);
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [day, setDay] = useState<Weekday>(today ?? '월');
  const week = TIMETABLES[cls];

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
                <Pressable
                  key={d}
                  onPress={() => setDay(d)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${d}요일${d === today ? ', 오늘' : ''}`}
                  style={[
                    styles.dayTab,
                    selected
                      ? { backgroundColor: palette.accent, borderColor: palette.accent }
                      : { borderColor: d === today ? palette.accent : palette.line },
                  ]}>
                  <Text style={[styles.dayTabText, { color: selected ? palette.onAccent : palette.text }]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>

          <Card style={styles.dayCard}>
            {week[day].map((subject, i) => {
              const period = i + 1;
              const isNow = day === today && period === nowPeriod;
              const bell = BELL[i];
              const who = teacherFor(subject, cls);
              const st = subjectTone(subject, palette.scheme);
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
                    accessibilityLabel={`${period}교시 ${subject}${who ? `, ${who}` : ''}, ${bell.start}부터 ${bell.end}까지${isNow ? ', 지금 수업 중' : ''}`}>
                    <IconChip icon={subjectIcon(subject)} subject={subject} size={42} />
                    <View style={styles.fill}>
                      <View style={styles.subjectRow}>
                        <Text style={[styles.periodTag, { color: st.fg }]}>{period}교시</Text>
                        <Text style={[styles.subject, { color: palette.text }]}>{subject}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={[styles.periodMeta, { color: palette.sub }]}>
                          {bell.start}–{bell.end}
                        </Text>
                        {who ? <Text style={[styles.periodMeta, { color: palette.sub }]}>{who}</Text> : null}
                      </View>
                    </View>
                    {isNow ? <Tag label="지금" tone="solid" /> : null}
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      ) : (
        <Card style={styles.weekCard}>
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
                  <Text style={[styles.weekPeriod, { color: palette.sub }]}>{bell.period}</Text>
                </View>
                {WEEKDAYS.map((d) => {
                  const subject = week[d][i];
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
                        {shortSubject(subject)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  classPicker: { marginBottom: 14 },

  dayTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  dayTab: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayTabText: { fontSize: 16, fontWeight: '800' },

  dayCard: { padding: 8 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16 },
  subjectRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  periodTag: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  subject: { fontSize: 18, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  periodMeta: { fontSize: 14, fontVariant: ['tabular-nums'] },
  lunch: { borderTopWidth: 1.5, borderBottomWidth: 1.5, borderStyle: 'dashed', paddingVertical: 10, marginVertical: 6, marginHorizontal: 12 },
  lunchText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  weekCard: { padding: 10 },
  weekRow: { flexDirection: 'row' },
  weekPeriodCell: { width: 26, alignItems: 'center', justifyContent: 'center' },
  weekPeriod: { fontSize: 14, fontWeight: '800' },
  weekHead: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 1, borderRadius: 10 },
  weekHeadText: { fontSize: 15, fontWeight: '800' },
  weekCell: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', margin: 2, borderRadius: 12 },
  weekCellText: { fontSize: 14, fontWeight: '700' },
  weekLunch: { borderTopWidth: 1.5, borderStyle: 'dashed', marginTop: 5, paddingTop: 5 },
  weekLunchText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
