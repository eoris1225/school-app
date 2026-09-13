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
  classLabel,
  classOf,
  gradeOf,
  WEEKDAYS,
  type ClassId,
  type Weekday,
} from '@/data/mock';
import { bellRange, lunchAfter, lunchSpan } from '@/lib/bells';
import { getClasses, getLessons, getSchoolLessons } from '@/lib/api';
import { byWeekday, sameNameSlots, withSwaps } from '@/lib/timetable';
import { useRemote } from '@/lib/use-remote';
import { subjectTone } from '@/constants/tones';
import { useApp } from '@/lib/app-state';
import { slotKey } from '@/lib/my-settings';
import { holidayName, readSubject } from '@/lib/subject';
import { cellsAt, clashes, mineFrom, teachCount, teacherWeek } from '@/lib/teacher-week';
import { currentPeriod, weekDates, weekdayOf } from '@/lib/time';


export default function TimetableScreen() {
  const { palette, now, school, swaps, role, me, teach, bells, bellsLoading, setTeachClasses, setTeachEdit } =
    useApp();
  const today = weekdayOf(now);
  const nowPeriod = currentPeriod(now, bells);
  /*
   * 점심 자리와 시각은 학교가 넣어둔 것만 써요.
   *
   * 안 넣은 학교에서는 점심 줄을 아예 안 그려요. "4교시 뒤"가 흔하긴 한데
   * 5교시 뒤인 학교도 있어요. 반쯤 맞는 줄을 그리느니 안 그리는 게 나아요.
   */
  const lunch = lunchAfter(bells);
  const span = lunchSpan(bells);
  const teacher = role === 'teacher';

  // 탭 화면은 학교를 고른 뒤에만 열려요. 그래서 school은 항상 있어요.
  const myClass = `${school?.grade ?? 1}-${school?.cls ?? '1'}`;
  const [cls, setCls] = useState<ClassId>(myClass);
  // 다른 반 시간표 고르기를 펴둘지. 평소에는 접어둬요.
  const [openClass, setOpenClass] = useState(false);
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
  const holiday = holidayName(week[day].filter((x): x is string => !!x));

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
  /*
   * 무엇이 내 수업인지는 내 정보에서 고른 과목 이름으로 봐요.
   *
   * 그 목록은 이 학교 시간표에 실제로 있는 이름을 NEIS에서 받아온 거라
   * 시간표와 그대로 맞아요. 교과군으로 보면 '미적분'만 맡은 분한테 확률과
   * 통계, 기하까지 다 걸려서 표가 남의 수업으로 뒤덮여요.
   *
   * 이름을 못 고른 계정만 교과군으로 봐요 (과목 목록을 못 받아온 학교이거나
   * 예전에 교과군으로만 골라둔 경우예요).
   */
  const mineSubjects = mineFrom(me?.teaches ?? [], me?.subjects ?? []);
  const myNames = mineSubjects.names;
  const myWeek = teacherWeek(all.data ?? [], dates, mineSubjects, teach);
  /*
   * 고치기 전, 시간표에 적힌 그대로의 주간표예요.
   *
   * 칸을 눌렀을 때 "이 시간에 어느 반이 있었지?"를 보여주려면 이게 있어야
   * 해요. myWeek 은 이미 고친 게 반영돼서, 한 번 고르고 나면 나머지 반이
   * 사라져서 다시 못 고르거든요. 들어가는 반을 좁혀둔 건 그대로 따라요.
   */
  const rawWeek = teacherWeek(all.data ?? [], dates, mineSubjects, {
    classes: teach.classes,
    edits: {},
  });
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
      {/*
        다른 반 시간표는 접어둬요.
        학생은 거의 늘 자기 반만 봐요. 그런데 학년 칩 셋에 반 칩 여덟이 항상
        떠 있으면 화면 위 다섯 줄을 남의 반 고르기가 먹어요. 눌렀을 때만 펴요.
      */}
      {mode !== 'teach' && !openClass && cls === myClass ? (
        <View style={styles.backRow}>
          <Tap
            onPress={() => setOpenClass(true)}
            accessibilityRole="button"
            hitSlop={10}
            depth={0.05}>
            <Text style={[styles.backText, { color: palette.accentDeep }]}>다른 반 시간표 보기</Text>
          </Tap>
        </View>
      ) : null}

      {mode !== 'teach' && (openClass || cls !== myClass) ? (
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
      <View style={styles.backRow}>
        <Tap
          onPress={() => {
            setCls(myClass);
            setOpenClass(false);
          }}
          accessibilityRole="button"
          hitSlop={10}
          depth={0.05}>
          <Text style={[styles.backText, { color: palette.accentDeep }]}>
            {cls !== myClass ? '내 반으로 돌아가기' : '접기'}
          </Text>
        </Tap>
      </View>
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

      {/*
        교시 시각이 왜 안 보이는지 알려주고, 넣을 수 있는 분께는 길을 내줘요.
        NEIS에는 이 정보가 없어서 선생님이 한 번 넣어야 해요.

        학생한테는 안 보여줘요. 학생은 할 수 있는 게 없는데 말해봐야
        답답하기만 해요.

        하루 화면 안에 뒀다가 옮겼어요. 선생님은 '내 수업'으로 들어오거든요.
        정작 넣을 수 있는 사람한테만 안 보이는 안내였어요.
      */}
      {teacher && !bellsLoading && !bells ? (
        <Tap
          onPress={() => router.push('/bell-times')}
          accessibilityRole="button"
          depth={0.03}
          style={[styles.bellHint, { backgroundColor: palette.tint }]}>
          <Text style={[styles.bellHintText, { color: palette.accentDeep }]}>
            교시 시각을 넣으면 몇 시부터인지 같이 보여드려요
          </Text>
        </Tap>
      ) : null}

      {mode === 'teach' ? (
        all.loading ? (
          <Loading text="학교 시간표를 불러오는 중이에요" rows={4} />
        ) : all.error ? (
          <ErrorNote text={all.error} onRetry={all.retryable ? all.retry : undefined} />
        ) : myNames.length === 0 && mineSubjects.groups.size === 0 ? (
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
                : myNames.length
                  ? `이번 주에 ${myNames.join(', ')} 수업이 없어요. 맡은 과목이 더 있으면 내 정보에서 골라주세요.`
                  : '이번 주에 내 교과군 수업이 없어요. 칸을 눌러 직접 넣을 수도 있어요.'}
            </Text>

            {/*
              같은 과목을 여러 선생님이 맡으면 같은 교시에 여러 반이 걸려요.
              감추지 않고 알려주되, 까닭을 여기서 길게 적지는 않아요. 빨간 글이
              다섯 줄이면 그것대로 읽기 싫어요. 무엇을 하면 되는지만 남기고,
              까닭은 칸을 눌렀을 때 그 자리에서 알려줘요.
            */}
            {overlap > 0 ? (
              <Text style={[styles.teachWarn, { color: palette.sunday }]}>
                {overlap}군데에서 같은 교시에 여러 반이 겹쳐요. 그 칸을 눌러 내 반을
                골라주세요.
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
                // 적어둔 글 그대로 불러와요. 표에 그려진 값은 반을 떼어낸
                // 뒤라서, 그걸 가져오면 고칠 때마다 반이 지워져요.
                setDraft(teach.edits[slotKey(d, period)] ?? '');
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

          {/*
            눌러서 바꿀 수 있다는 걸 알려줘요.
            선택과목 학생은 시간표에 '일본 문화'라고 적혀 있어도 실제로는 다른
            과목을 들어요. 그걸 바꿀 수 있다는 걸 지금까지는 손가락으로 눌러봐야
            알았어요. 읽어주기 라벨에만 적혀 있었거든요. 한 줄 적어둬요.
            바꾼 게 하나라도 있으면 이미 아는 거라 안 보여줘요.
          */}
          {mine && !holiday && Object.keys(swaps).length === 0 ? (
            <Text style={[styles.swapHint, { color: palette.sub }]}>
              내가 듣는 과목과 다르면 그 줄을 눌러서 바꿔요.
            </Text>
          ) : null}

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
              /*
               * 빈 교시도 자리를 남겨요.
               *
               * 예전에는 통째로 건너뛰었어요. 그러면 4교시 다음에 바로 6교시가
               * 나와서 "5교시 왜 없지, 앱이 고장났나?" 싶어요. 실제로 서일여고
               * 수요일은 5교시가 NEIS에 없어요. 없는 건 없다고 말해줘야죠.
               *
               * 다만 뒤쪽 빈 교시는 안 그려요. 7교시까지 있는 날이 있고 5교시에
               * 끝나는 날이 있는데, 끝난 뒤에 빈 줄을 세 개 그리면 그것대로
               * 이상해요. 마지막 수업 뒤는 그냥 끝이에요.
               */
              const lastLesson = arr.reduce((acc, r, k) => (r ? k : acc), -1);
              if (!shown && i > lastLesson) return null;
              const period = i + 1;
              /*
               * 점심시간을 끼워 넣을 자리예요.
               *
               * 예전에는 "점심 뒤 첫 수업"을 찾았어요. 그런데 빈 교시도 그리게
               * 되면서 어긋났어요. 5교시가 비어 있으면 그 줄이 점심 위에 떠요.
               * 5교시 시각은 13:30인데 12:30 점심보다 앞에 나오는 거예요.
               * 수업이 있든 없든 자리는 정해져 있으니 교시로 바로 정해요.
               */
              const lunchAt = lunch > 0 && lunch <= lastLesson ? lunch : -1;
              const afterLunch = lunchAt === i;
              const lunchRow = afterLunch && span ? (
                <View style={[styles.lunch, { borderColor: palette.line }]}>
                  <Text style={[styles.lunchText, { color: palette.sub }]}>
                    점심시간 {span.start}부터 {span.end}까지
                  </Text>
                </View>
              ) : null;

              if (!shown) {
                return (
                  <Reveal key={`${cls}:${day}:${period}`} delay={i * 45} distance={10}>
                    {lunchRow}
                    <View style={[styles.periodRow, styles.emptyRow]}>
                      <Text style={[styles.periodTag, { color: palette.sub }]}>{period}교시</Text>
                      <Text style={[styles.emptyText, { color: palette.sub }]}>
                        시간표에 없어요
                      </Text>
                      {/* 학교가 교시 시각을 안 넣었으면 이 자리는 아예 없어요. */}
                      {bellRange(bells, period) ? (
                        <Text numeric style={[styles.periodMeta, { color: palette.sub }]}>
                          {bellRange(bells, period)}
                        </Text>
                      ) : null}
                    </View>
                    {i < lastLesson && i + 1 !== lunchAt ? <Divider /> : null}
                  </Reveal>
                );
              }

              // 시간표에 적힌 원래 이름. 바꾸는 화면에 이걸 넘겨줘요.
              const original = raw[day][i];
              const subject = readSubject(shown);
              const swapped = mine && swaps[slotKey(day, period)] !== undefined;
              const isNow = day === today && period === nowPeriod;
              const range = bellRange(bells, period);
              const st = subjectTone(shown, palette.scheme);
              return (
                // 요일이나 반을 바꾸면 key가 달라져서 줄이 다시 올라와요.
                // 내용만 조용히 갈리면 바뀐 걸 눈치채기 어려워요.
                <Reveal key={`${cls}:${day}:${period}`} delay={i * 45} distance={10}>
                  {lunchRow}
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
                    accessibilityLabel={`${period}교시 ${subject.name}${subject.makeup ? ', 보강' : ''}${range ? `, ${range}` : ''}${isNow ? ', 지금 수업 중' : ''}${mine ? ', 눌러서 내가 듣는 과목으로 바꾸기' : ''}`}>
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
                      {range ? (
                        <View style={styles.metaRow}>
                          <Text numeric style={[styles.periodMeta, { color: palette.sub }]}>
                            {range}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {swapped ? <Tag label="바꿈" /> : null}
                    {isNow ? <Tag label="지금" tone="solid" /> : null}
                  </Tap>
                  {/* 마지막 줄과 점심 바로 앞에는 구분선을 안 그려요. */}
                  {i < lastLesson && i + 1 !== lunchAt ? <Divider /> : null}
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
                      // 빈 칸을 눌렀으면 적어 넣는 화면으로 가요. 원래 이름이 없어요.
                      subject: raw[d][period - 1] ?? '',
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
            {/*
              반을 고르라고 물어보는 칸이 아래에 나오면 이 줄은 안 보여줘요.
              같은 말을 두 번 하면 둘 다 안 읽혀요.
            */}
            {cellsAt(rawWeek, editing.day, editing.period).length > 1 ? null : (
              <Text style={[styles.teachHelp, { color: palette.sub }]}>
                {cellsAt(myWeek, editing.day, editing.period).length
                  ? '시간표에 있는 그대로예요. 내 수업이 아니거나 다른 반이면 고쳐주세요.'
                  : '비어 있는 칸이에요. 회의나 보강처럼 시간표에 없는 것도 적을 수 있어요.'}
              </Text>
            )}

            {/*
              이 시간에 걸린 반이 여럿이면 그대로 늘어놔요.
              같은 과목을 여러 선생님이 맡으면 NEIS만 봐서는 누가 어느 반인지
              알 수가 없어요. 그걸 선생님한테 타이핑으로 떠넘기지 않고, 한 번
              눌러서 고르게 해요. 어차피 답은 이 목록 안에 있으니까요.
            */}
            {cellsAt(rawWeek, editing.day, editing.period).length > 1 ? (
              <View style={styles.teachPickBlock}>
                <Text style={[styles.teachHelp, { color: palette.text }]}>
                  이 시간에 들어가는 반을 골라주세요
                </Text>
                <Text style={[styles.teachNote, { color: palette.sub }]}>
                  같은 과목을 맡은 선생님이 여러 분이에요. NEIS는 누가 어느 반에
                  들어가는지 알려주지 않아서 앱이 고를 수 없어요.
                </Text>
                {cellsAt(rawWeek, editing.day, editing.period).map((c) => {
                  const text = `${c.cls} ${readSubject(c.subject).name}`;
                  const on = teach.edits[slotKey(editing.day, editing.period)] === text;
                  return (
                    <View key={`${c.cls}:${c.subject}`} style={styles.teachGap}>
                      <Button
                        label={on ? `${text} ✓` : text}
                        variant="secondary"
                        onPress={() => {
                          setTeachEdit(editing.day, editing.period, text);
                          setEditing(null);
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            ) : null}

            <Field
              value={draft}
              onChangeText={setDraft}
              placeholder="예: 2-6 선택B 역학과 에너지"
              maxLength={40}
              accessibilityLabel="이 칸에 들어갈 내용"
              style={styles.teachInput}
            />
            <Text style={[styles.teachNote, { color: palette.sub }]}>
              앞에 ‘2-6’처럼 반을 적으면 표에도 반이 같이 떠요.
            </Text>
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
  teachGap: { marginBottom: 8 },
  teachPickBlock: { marginBottom: 16 },
  teachNote: { fontSize: 12, lineHeight: 18, marginTop: -8, marginBottom: 16 },
  teachClasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },

  dayTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dayTab: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayTabText: { fontSize: 15, fontWeight: '800' },

  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, marginHorizontal: -12, borderRadius: 16 },
  bellHint: { minHeight: 44, justifyContent: 'center', borderRadius: 16, paddingHorizontal: 16, marginBottom: 12 },
  bellHintText: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  swapHint: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  emptyRow: { paddingVertical: 10, opacity: 0.7 },
  emptyText: { flex: 1, fontSize: 13 },
  subjectRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  periodTag: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  subject: { fontSize: 15, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  periodMeta: { fontSize: 12, fontVariant: ['tabular-nums'] },
  lunch: { borderTopWidth: 1, borderBottomWidth: 1, borderStyle: 'dashed', paddingVertical: 12, marginVertical: 8 },
  lunchText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

});
