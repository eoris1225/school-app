import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { subjectArt } from '@/components/emoji';
import { Reveal, Tap } from '@/components/motion';
import { WeekGrid } from '@/components/week-grid';
import { Sheet } from '@/components/sheet';
import { TeachGrid } from '@/components/teach-grid';
import { Button, Chip, ChipRow, Divider, Empty, ErrorNote, Field, Header, IconChip, Loading, Screen, Segmented, Tag } from '@/components/ui';
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
import { getClasses, getLessons, getSchoolLessons } from '@/lib/api';
import { byWeekday, sameNameSlots, withSwaps } from '@/lib/timetable';
import { useRemote } from '@/lib/use-remote';
import { subjectTone } from '@/constants/tones';
import { useApp } from '@/lib/app-state';
import { slotKey } from '@/lib/my-settings';
import { holidayName, readSubject, subjectGroup } from '@/lib/subject';
import { cellsAt, clashes, teachCount, teacherWeek } from '@/lib/teacher-week';
import { currentPeriod, weekDates, weekdayOf } from '@/lib/time';


export default function TimetableScreen() {
  const { palette, now, school, swaps, role, me, teach, setTeachClasses, setTeachEdit } = useApp();
  const today = weekdayOf(now);
  const nowPeriod = currentPeriod(now);
  const teacher = role === 'teacher';

  // 탭 화면은 학교를 고른 뒤에만 열려요. 그래서 school은 항상 있어요.
  const myClass = `${school?.grade ?? 1}-${school?.cls ?? '1'}`;
  const [cls, setCls] = useState<ClassId>(myClass);
  // 선생님은 '내 수업'에서 시작해요. 자기 시간표가 먼저 궁금하니까요.
  const [mode, setMode] = useState<'day' | 'week' | 'teach'>(teacher ? 'teach' : 'day');
  const [day, setDay] = useState<Weekday>(today ?? '월');
  // 칸을 고치는 팝업. 어느 칸인지와 적고 있는 내용이에요.
  const [editing, setEditing] = useState<{ day: Weekday; period: number } | null>(null);
  const [draft, setDraft] = useState('');
  const [pickClasses, setPickClasses] = useState(false);

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

  /*
   * 선생님 시간표예요.
   *
   * 학교 전체 시간표를 한 번에 받아와서 내 교과군 칸만 뽑아요. NEIS에는
   * 담당 교사 칸이 아예 없어서 "내 시간표 주세요"가 성립하지 않아요.
   * 반을 하나씩 부르면 스물네 번 다녀와야 하는데 이건 한 번이에요.
   * 규칙은 lib/teacher-week.ts 에 모아뒀고 따로 재봤어요
   * (scripts/check-teacher-week.ts).
   */
  const all = useRemote(`school-timetable:${school?.code}:${dates.월}`, () =>
    teacher ? getSchoolLessons(dates.월, dates.금, school ?? undefined) : Promise.resolve([]),
  );
  // 실제 과목 이름은 '미적분Ⅰ' 처럼 와요. 이름을 맞춰보면 하나도 안 걸려서
  // 교과군으로 봐요. 수학 선생님이면 수학 교과군을 다 내 수업으로요.
  const myGroups = new Set((me?.subjects ?? []).map((x) => subjectGroup(x)));
  const myWeek = teacherWeek(all.data ?? [], dates, myGroups, teach);
  const total = teachCount(myWeek);
  const overlap = clashes(myWeek);

  return (
    <Screen>
      <Header subtitle={classLabel(cls)} title="시간표" />

      {/*
        다른 반 시간표도 볼 수 있어요. 반이 스물네 개라 한 줄로 늘어놓으면
        못 찾으니 학년과 반을 나눠서 골라요.

        '내 수업'에서는 안 보여줘요. 거기서는 어느 반을 보는지가 아니라
        내가 어디 들어가는지가 궁금한 거예요. 반 고르기는 이 화면 아래쪽에
        따로 있어요.
      */}
      {mode !== 'teach' ? (
        <>
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
        </>
      ) : null}

      <Segmented
        value={mode}
        onChange={setMode}
        options={
          teacher
            ? [
                { value: 'teach' as const, label: '내 수업' },
                { value: 'day' as const, label: '하루' },
                { value: 'week' as const, label: '한 주' },
              ]
            : [
                { value: 'day' as const, label: '하루' },
                { value: 'week' as const, label: '한 주' },
              ]
        }
      />

      {mode === 'teach' ? (
        all.loading ? (
          <Loading text="학교 시간표를 불러오는 중이에요" rows={4} />
        ) : all.error ? (
          <ErrorNote text={all.error} onRetry={all.retryable ? all.retry : undefined} />
        ) : myGroups.size === 0 ? (
          <Empty
            art="warn"
            text="담당 과목을 먼저 골라주세요"
            hint="내 정보에서 맡은 과목을 고르면 그 과목 수업을 모아서 보여드려요."
          />
        ) : (
          <>
            <Text style={[styles.teachHelp, { color: palette.sub }]}>
              {total
                ? `이번 주 내 수업 ${total}개예요. 칸을 누르면 고칠 수 있어요.`
                : '이번 주에 내 교과군 수업이 없어요. 칸을 눌러 직접 넣을 수도 있어요.'}
            </Text>

            {/*
              같은 교시에 두 반이 걸렸어요. 선생님은 한 번에 한 반에만
              들어가니, 같은 과목 선생님이 여러 분이라는 뜻이에요.
              감추지 않고 알려주고 좁히는 길을 같이 줘요.
            */}
            {overlap > 0 ? (
              <Text style={[styles.teachWarn, { color: palette.sunday }]}>
                {overlap}군데에서 같은 교시에 두 반이 겹쳐요. NEIS는 어느 선생님이 어느 반에
                들어가는지 알려주지 않아요. 아래에서 내가 들어가는 반만 골라주세요.
              </Text>
            ) : null}

            <View style={styles.teachRow}>
              <Tap
                onPress={() => setPickClasses(true)}
                accessibilityRole="button"
                depth={0.04}
                style={[styles.teachPick, { backgroundColor: palette.tint }]}>
                <Text style={[styles.teachPickText, { color: palette.accentDeep }]}>
                  {teach.classes.length ? `들어가는 반 ${teach.classes.length}개` : '들어가는 반 고르기'}
                </Text>
              </Tap>
              {Object.keys(teach.edits).length ? (
                <Tap
                  onPress={() => setTeachClasses(teach.classes)}
                  accessibilityRole="button"
                  depth={0.04}
                  style={styles.teachReset}>
                  <Text style={[styles.teachPickText, { color: palette.sub }]}>
                    고친 칸 {Object.keys(teach.edits).length}개
                  </Text>
                </Tap>
              ) : null}
            </View>

            <TeachGrid
              week={myWeek}
              settings={teach}
              today={today}
              nowPeriod={nowPeriod}
              onPick={(d, period) => {
                const has = cellsAt(myWeek, d, period);
                setDraft(has.length && has[0].added ? has[0].subject : '');
                setEditing({ day: d, period });
              }}
            />
          </>
        )
      ) : mode === 'day' ? (
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

      {/*
        칸 하나를 고치는 팝업이에요.
        NEIS가 선택과목 블록에 대표 과목 하나만 적고, 회의나 보강은 아예
        없어요. 그걸 메울 수 있는 자리가 이거예요.
      */}
      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.day}요일 ${editing.period}교시` : ''}>
        {editing ? (
          <>
            <Text style={[styles.teachHelp, { color: palette.sub }]}>
              {cellsAt(myWeek, editing.day, editing.period).length
                ? '시간표에 있는 그대로예요. 내 수업이 아니거나 다른 반이면 고쳐주세요.'
                : '비어 있는 칸이에요. 회의나 보강처럼 시간표에 없는 것도 적을 수 있어요.'}
            </Text>
            <Field
              value={draft}
              onChangeText={setDraft}
              placeholder="예: 2-6 선택B 역학과 에너지"
              maxLength={40}
              accessibilityLabel="이 칸에 들어갈 내용"
              style={styles.teachInput}
            />
            <Button
              label={draft.trim() ? `‘${draft.trim()}’로 두기` : '내용을 적어주세요'}
              icon="check"
              disabled={!draft.trim()}
              onPress={() => {
                setTeachEdit(editing.day, editing.period, draft.trim());
                setEditing(null);
              }}
            />
            <View style={styles.teachGap} />
            <Button
              label="내 수업 아니에요"
              variant="secondary"
              onPress={() => {
                setTeachEdit(editing.day, editing.period, '');
                setEditing(null);
              }}
            />
            {teach.edits[slotKey(editing.day, editing.period)] !== undefined ? (
              <>
                <View style={styles.teachGap} />
                <Button
                  label="시간표 그대로 되돌리기"
                  variant="secondary"
                  onPress={() => {
                    setTeachEdit(editing.day, editing.period, null);
                    setEditing(null);
                  }}
                />
              </>
            ) : null}
          </>
        ) : null}
      </Sheet>

      {/* 들어가는 반 고르기. 안 고르면 그 과목 수업이 전부 보여요. */}
      <Sheet visible={pickClasses} onClose={() => setPickClasses(false)} title="들어가는 반">
        <Text style={[styles.teachHelp, { color: palette.sub }]}>
          내가 수업에 들어가는 반만 골라주세요. 아무것도 안 고르면 내 교과군 수업이 전부 보여요.
          같은 과목 선생님이 여러 분이면 좁혀야 내 시간표가 돼요.
        </Text>
        <View style={styles.teachClasses}>
          {(rooms.data ?? []).map((r) => {
            const id = `${r.grade}-${r.cls}`;
            const on = teach.classes.includes(id);
            return (
              <Chip
                key={id}
                label={`${r.grade}-${r.cls}`}
                selected={on}
                onPress={() =>
                  setTeachClasses(
                    on ? teach.classes.filter((x) => x !== id) : [...teach.classes, id],
                  )
                }
              />
            );
          })}
        </View>
        {teach.classes.length ? (
          <Button label="전부 지우기" variant="secondary" onPress={() => setTeachClasses([])} />
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  classPicker: { marginBottom: 8 },
  backRow: { alignItems: 'flex-start', marginBottom: 8 },
  backText: { fontSize: 13, fontWeight: '700', paddingVertical: 8 },

  teachHelp: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  teachWarn: { fontSize: 13, lineHeight: 20, fontWeight: '600', marginBottom: 12 },
  teachRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  teachPick: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 20 },
  teachReset: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  teachPickText: { fontSize: 13, fontWeight: '700' },
  teachInput: { borderRadius: 16, height: 52, paddingHorizontal: 16, marginBottom: 16 },
  teachGap: { height: 8 },
  teachClasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },

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
