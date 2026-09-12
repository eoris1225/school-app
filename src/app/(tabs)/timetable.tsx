import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { subjectArt } from '@/components/emoji';
import { Reveal, Tap } from '@/components/motion';
import { WeekGrid } from '@/components/week-grid';
import { Chip, ChipRow, Divider, Empty, ErrorNote, Header, IconChip, Loading, Screen, Segmented, Tag } from '@/components/ui';
import {
  BELL,
  classLabel,
  classOf,
  gradeOf,
  LUNCH,
  WEEKDAYS,
  type ClassId,
  type Weekday,
} from '@/data/mock';
import { getClasses, getLessons } from '@/lib/api';
import { byWeekday, sameNameSlots, withSwaps } from '@/lib/timetable';
import { useRemote } from '@/lib/use-remote';
import { subjectTone } from '@/constants/tones';
import { useApp } from '@/lib/app-state';
import { slotKey } from '@/lib/my-settings';
import { holidayName, readSubject } from '@/lib/subject';
import { currentPeriod, weekDates, weekdayOf } from '@/lib/time';


export default function TimetableScreen() {
  const { palette, now, school, swaps } = useApp();
  const today = weekdayOf(now);
  const nowPeriod = currentPeriod(now);

  // 탭 화면은 학교를 고른 뒤에만 열려요. 그래서 school은 항상 있어요.
  const myClass = `${school?.grade ?? 1}-${school?.cls ?? '1'}`;
  const [cls, setCls] = useState<ClassId>(myClass);
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [day, setDay] = useState<Weekday>(today ?? '월');

  // 한 주치를 한 번에 받아둬요. 요일이나 하루/한 주를 눌러도 다시 부르지 않아요.
  const dates = weekDates(now);
  const remote = useRemote(`timetable:${school?.code}:${cls}:${dates.월}`, () =>
    getLessons(gradeOf(cls), classOf(cls), dates.월, dates.금, school ?? undefined),
  );

  // 반 목록도 그 학교 것으로 받아와요. 학교마다 학년·반 개수가 달라요.
  const year = now.getFullYear();
  const rooms = useRemote(`tt-classes:${school?.code}:${year}`, () =>
    getClasses(year, school ?? undefined),
  );
  const pickedGrade = gradeOf(cls);
  const allGrades = [...new Set((rooms.data ?? []).map((r) => r.grade))].sort((a, b) => a - b);
  const gradeClasses = (rooms.data ?? [])
    .filter((r) => r.grade === pickedGrade)
    .map((r) => r.cls)
    .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));

  // 내가 듣는 과목으로 바꿔서 보여줘요. 다른 반을 볼 때는 바꾸지 않아요.
  // 남의 반 시간표까지 내 기준으로 바꾸면 잘못된 정보가 돼요.
  const mine = cls === myClass;
  // 시간표에 적힌 그대로와, 내가 듣는 과목으로 바꾼 것을 둘 다 들고 있어요.
  // 바꾸는 화면에 "시간표에는 이렇게 적혀 있어요"를 넘겨줘야 하거든요.
  const raw = byWeekday(remote.data ?? [], dates);
  // 다른 반 시간표를 볼 때는 바꾸지 않아요. 남의 반까지 내 기준으로
  // 바꾸면 잘못된 정보가 돼요.
  const week = mine ? withSwaps(raw, swaps) : raw;
  const holiday = holidayName(week[day].filter(Boolean));

  return (
    <Screen>
      <Header subtitle={classLabel(cls)} title="시간표" />

      {/* 다른 반 시간표도 볼 수 있어요. 반이 스물네 개라 한 줄로 늘어놓으면
          못 찾으니 학년과 반을 나눠서 골라요. */}
      <View style={styles.classPicker}>
        <ChipRow>
          {allGrades.map((g) => (
            <Chip
              key={g}
              label={`${g}학년`}
              selected={g === pickedGrade}
              // 학년을 바꾸면 같은 번호 반으로 옮겨요. 없으면 1반이에요.
              onPress={() => setCls(`${g}-${classOf(cls)}`)}
            />
          ))}
        </ChipRow>
      </View>
      <View style={styles.classPicker}>
        <ChipRow>
          {gradeClasses.map((c) => (
            <Chip
              key={c}
              label={`${c}반`}
              selected={c === classOf(cls)}
              onPress={() => setCls(`${pickedGrade}-${c}`)}
            />
          ))}
        </ChipRow>
      </View>
      {cls !== myClass ? (
        <View style={styles.backRow}>
          <Tap onPress={() => setCls(myClass)} accessibilityRole="button" hitSlop={10} depth={0.05}>
            <Text style={[styles.backText, { color: palette.accentDeep }]}>내 반으로 돌아가기</Text>
          </Tap>
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
              <Empty art="party" text={`${day}요일은 ${holiday}이라 수업이 없어요`} />
            ) : week[day].filter(Boolean).length === 0 ? (
              <Empty
                art="timetable"
                text={`${day}요일은 등록된 시간표가 없어요`}
                hint="학교가 아직 안 올렸을 수 있어요."
              />
            ) : (
            week[day].map((shown, i, arr) => {
              if (!shown) return null;
              // 점심 뒤 첫 수업이 어느 줄인지. 그 위에 점심시간을 끼워 넣어요.
              const lunchAt = arr.findIndex((r, k) => !!r && k + 1 > LUNCH.afterPeriod);
              const afterLunch = lunchAt === i;
              const period = i + 1;
              // 시간표에 적힌 원래 이름. 바꾸는 화면에 이걸 넘겨줘요.
              const original = raw[day][i];
              const subject = readSubject(shown);
              const swapped = mine && swaps[slotKey(day, period)] !== undefined;
              const isNow = day === today && period === nowPeriod;
              const bell = BELL[i];
              const st = subjectTone(shown, palette.scheme);
              return (
                // 요일이나 반을 바꾸면 key가 달라져서 줄이 다시 올라와요.
                // 내용만 조용히 갈리면 바뀐 걸 눈치채기 어려워요.
                <Reveal key={`${cls}:${day}:${period}`} delay={i * 45} distance={10}>
                  {afterLunch ? (
                    <View style={[styles.lunch, { borderColor: palette.line }]}>
                      <Text style={[styles.lunchText, { color: palette.sub }]}>
                        점심시간 {LUNCH.start}부터 {LUNCH.end}까지
                      </Text>
                    </View>
                  ) : null}
                  {/* 내 반일 때만 눌러서 내가 듣는 과목으로 바꿀 수 있어요. */}
                  <Tap
                    onPress={
                      mine
                        ? () =>
                            router.push({
                              pathname: '/swap-subject',
                              params: {
                                day,
                                period: String(period),
                                subject: original,
                                // 같은 이름이 나오는 다른 교시들. 한 번에 바꿀지
                                // 고를 수 있게 넘겨줘요.
                                same: sameNameSlots(raw, day, period, original).join(','),
                              },
                            })
                        : undefined
                    }
                    disabled={!mine}
                    depth={mine ? 0.02 : 0}
                    style={[styles.periodRow, isNow && { backgroundColor: st.bg }]}
                    accessibilityRole={mine ? 'button' : undefined}
                    accessibilityLabel={`${period}교시 ${subject.name}${subject.makeup ? ', 보강' : ''}, ${bell.start}부터 ${bell.end}까지${isNow ? ', 지금 수업 중' : ''}${mine ? ', 눌러서 내가 듣는 과목으로 바꾸기' : ''}`}>
                    {/*
                      교시마다 과목 색을 주면 한 화면에 일곱 색이 깔려서
                      어디를 봐야 할지 모르겠어요. 평소에는 조용히 두고
                      지금 하는 수업만 색으로 남겨요.
                    */}
                    <IconChip art={subjectArt(shown)} subject={shown} size={42} quiet={!isNow} />
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
                      </View>
                    </View>
                    {swapped ? <Tag label="바꿈" /> : null}
                    {isNow ? <Tag label="지금" tone="solid" /> : null}
                  </Tap>
                  {i < arr.length - 1 && arr.findIndex((r, k) => !!r && k > i) !== lunchAt ? <Divider /> : null}
                </Reveal>
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
        <WeekGrid
          week={week}
          today={today}
          nowPeriod={nowPeriod}
          swaps={mine ? swaps : undefined}
          // 다른 반 시간표에서는 못 바꿔요. 남의 반까지 내 기준으로 바꾸면
          // 잘못된 정보가 돼요.
          onPick={
            mine
              ? (d, period) =>
                  router.push({
                    pathname: '/swap-subject',
                    params: {
                      day: d,
                      period: String(period),
                      subject: raw[d][period - 1],
                      same: sameNameSlots(raw, d, period, raw[d][period - 1]).join(','),
                    },
                  })
              : undefined
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  classPicker: { marginBottom: 8 },
  backRow: { alignItems: 'flex-start', marginBottom: 8 },
  backText: { fontSize: 13, fontWeight: '700', paddingVertical: 8 },

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

});
