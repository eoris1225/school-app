import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DateSheet } from '@/components/date-picker';
import { Tap } from '@/components/motion';
import { EventRow } from '@/components/rows';
import { Text } from '@/components/text';
import { BackHeader, Button, Chip, ChipRow, Empty, ErrorNote, Field, goBack, IconButton, Loading, Screen, Segmented } from '@/components/ui';
import { type EventKind } from '@/data/mock';
import { TEACHABLE } from '@/lib/subject';
import { getClasses, getSchoolLessons } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { mineFrom, teacherWeek } from '@/lib/teacher-week';
import { addDays, formatDay, fromYmd, toYmd, weekDates } from '@/lib/time';
import { useRemote } from '@/lib/use-remote';

/** 이미 골라둔 목록에서 하나를 켜고 끄는 걸 반복해요. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function AddEventScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const { palette, role, now, addEvent, school, me, events, teach } = useApp();
  // 내 담당 과목을 처음부터 골라둬요. 과목 선생님이 제일 자주 쓰는 값이에요.
  const myFirstSubject: string =
    me?.subjects.find((s) => (TEACHABLE as readonly string[]).includes(s)) ?? TEACHABLE[0];
  const [kind, setKind] = useState<EventKind>('academic');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => (params.date ? fromYmd(params.date) : now));
  const [grades, setGrades] = useState<number[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>(myFirstSubject);
  const [detail, setDetail] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [pickDate, setPickDate] = useState(false);

  // 학년·반 목록은 그 학교 실제 목록에서 가져와요. 학교마다 반 개수가 달라요.
  const year = now.getFullYear();
  const rooms = useRemote(`add-classes:${school?.code}:${year}`, () =>
    getClasses(year, school ?? undefined),
  );
  const allGrades = [...new Set((rooms.data ?? []).map((r) => r.grade))].sort((a, b) => a - b);
  // 고른 학년들에 실제로 있는 반만 보여줘요.
  /*
   * 내가 들어가는 반이에요.
   *
   * 앱은 이미 알고 있어요. 시간표 탭에서 학교 전체 시간표를 받아 내 과목만
   * 뽑아내잖아요. 거기 나온 반이 곧 내가 들어가는 반이에요. 그런데 여기서는
   * 매번 학년 누르고 반 여덟 개 중에 다섯 개를 손으로 골라야 했어요.
   * 아는 걸 또 물어보는 셈이라 한 번에 넣는 버튼을 둬요.
   *
   * 시간표는 이미 받아둔 것을 그대로 써요 (같은 열쇠라 다시 안 불러요).
   */
  const dates = weekDates(now);
  const lessons = useRemote(`school-timetable:${school?.code}:${dates.월}`, () =>
    role === 'teacher' ? getSchoolLessons(dates.월, dates.금, school ?? undefined) : Promise.resolve([]),
  );
  const myWeek = teacherWeek(
    lessons.data ?? [],
    dates,
    mineFrom(me?.teaches ?? [], me?.subjects ?? []),
    teach,
  );
  const myRooms = [
    ...new Set(
      Object.values(myWeek)
        .flat()
        .map((c) => c.cls)
        .filter((c): c is string => !!c),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));

  /*
   * 반을 '2-1' 모양 그대로 담아요.
   *
   * 학년 목록과 반 목록으로 쪼개면 안 돼요. 1-5와 2-1에 들어가는 선생님이
   * 학년 [1,2] · 반 [5,1] 로 적으면 1-1과 2-5 학생한테도 뜨거든요. 곱해지니까요.
   * 학년 칸도 같이 채워요. 거르개가 학년을 먼저 보기 때문이에요.
   */
  const pickMyRooms = () => {
    setGrades([...new Set(myRooms.map((r) => Number(r.split('-')[0])))].sort((a, b) => a - b));
    setClasses(myRooms);
  };

  /** 반을 콕 집어 골라둔 상태인지. 그때는 반 번호 칩 대신 반 이름을 보여줘요. */
  const exact = classes.some((c) => c.includes('-'));

  const allClasses = [
    ...new Set(
      (rooms.data ?? []).filter((r) => grades.includes(r.grade)).map((r) => r.cls),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));

  if (role !== 'teacher') {
    return (
      <Screen bottomInset>
        <BackHeader title="일정 추가" />
        <Empty
          art="warn"
          text="일정은 선생님만 추가할 수 있어요"
          hint="선생님이시면 내 정보에서 코드를 넣어주세요."
        />
      </Screen>
    );
  }

  /*
   * 그 날 이미 있는 수행평가예요.
   *
   * 반을 골랐으면 겹치는 반의 것만 봐요. 2학년 3반에 잡는데 1학년 수행평가가
   * 몇 개 있든 그 반 학생은 상관없거든요.
   */
  const overlaps = (e: (typeof events)[number]) => {
    if (e.kind !== 'assessment') return false;
    if (grades.length === 0 || e.grades.length === 0) return true;
    if (!e.grades.some((g) => grades.includes(g))) return false;
    if (classes.length === 0 || e.classes.length === 0) return true;
    return e.classes.some((c) => classes.includes(c));
  };
  const onDay = (ymd: string) => events.filter((e) => e.date === ymd && overlaps(e));
  const sameDay = onDay(toYmd(date));

  const draft = {
    id: 'preview',
    date: toYmd(date),
    title: title.trim() || '일정 제목',
    kind,
    subject: kind === 'assessment' ? subject : undefined,
    detail: detail.trim() || undefined,
    grades,
    classes,
  };

  const save = async () => {
    setSaving(true);
    setFailed(null);
    const problem = await addEvent({
      date: draft.date,
      title: title.trim(),
      kind,
      subject: draft.subject,
      detail: detail.trim() || undefined,
      grades,
      classes,
    });
    setSaving(false);
    // 잘 됐을 때만 화면을 닫아요. 안 됐으면 왜 안 됐는지 보여줘야죠.
    if (problem) setFailed(problem);
    else goBack();
  };

  return (
    <Screen bottomInset>
      <BackHeader title="일정 추가" subtitle="학생 달력에 바로 보여요" />

      <Text style={[styles.label, { color: palette.text }]}>종류</Text>
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'academic', label: '학사일정' },
          { value: 'assessment', label: '수행평가' },
        ]}
      />

      <Text style={[styles.label, { color: palette.text }]}>제목</Text>
      <Field
        value={title}
        onChangeText={setTitle}
        placeholder={kind === 'assessment' ? '예: 이차함수 활용 수행평가' : '예: 체육대회'}
        accessibilityLabel="일정 제목"
        style={styles.input}
      />

      {/*
        준비물이나 범위 같은 안내예요. 제목 한 줄로는 "뭘 챙겨가야 하지"를
        알 수가 없어요. 안 적어도 되니까 비워두면 그냥 안 보여요.
      */}
      <Text style={[styles.label, { color: palette.text }]}>자세한 내용 (안 적어도 돼요)</Text>
      <Field
        value={detail}
        onChangeText={setDetail}
        placeholder={
          kind === 'assessment'
            ? '예: 교과서 132~150쪽 범위예요. 자와 각도기 꼭 챙겨오세요.'
            : '예: 체육복 입고 등교하세요. 우천 시 다음 주로 미뤄요.'
        }
        multiline
        maxLength={500}
        accessibilityLabel="자세한 내용"
        style={styles.detail}
      />
      <Text style={[styles.sub, { color: palette.sub }]}>
        적어두면 학생이 일정을 눌러서 볼 수 있어요. {detail.length}/500자
      </Text>

      <Text style={[styles.label, { color: palette.text }]}>날짜</Text>
      <View style={[styles.dateRow, { backgroundColor: palette.tint }]}>
        <IconButton icon="back" label="하루 전" onPress={() => setDate((d) => addDays(d, -1))} />
        {/*
          가운데를 누르면 달력이 떠요. 화살표만 있으면 두 달 뒤 수행평가를
          잡을 때 일흔 번을 눌러야 해요. 하루 이틀 옮기는 건 화살표가 빠르니
          둘 다 둬요.
        */}
        <Tap
          onPress={() => setPickDate(true)}
          accessibilityRole="button"
          accessibilityLabel={`${formatDay(date)}, 눌러서 날짜 고르기`}
          depth={0.04}
          style={styles.dateTap}>
          <Text style={[styles.dateText, { color: palette.text }]}>{formatDay(date)}</Text>
          <Text style={[styles.dateHint, { color: palette.accentDeep }]}>달력에서 고르기</Text>
        </Tap>
        <IconButton icon="next" label="하루 뒤" onPress={() => setDate((d) => addDays(d, 1))} />
      </View>

      {/*
        그 날 이미 잡힌 수행평가를 알려줘요.
        하루에 수행평가가 일곱 개씩 몰리는 건 학생 잘못이 아니에요. 선생님들이
        서로 언제 잡았는지 볼 방법이 없어서 생기는 일이에요. 여기서 한 줄만
        보여줘도 날짜를 옮길 수 있어요. 막지는 않아요. 사정이 있을 수 있으니까요.
      */}
      {sameDay.length ? (
        <Text style={[styles.clash, { color: palette.sunday }]}>
          이 날 이미 수행평가가 {sameDay.length}개 있어요
          {` (${sameDay.map((e) => e.title).join(', ')})`}. 다른 날로 옮기면 학생이 덜 힘들어요.
        </Text>
      ) : null}

      <DateSheet
        visible={pickDate}
        value={date}
        marksOf={(ymd) => onDay(ymd).length}
        onPick={(d) => {
          setDate(d);
          setPickDate(false);
        }}
        onClose={() => setPickDate(false)}
      />

      <Text style={[styles.label, { color: palette.text }]}>누구에게 보일까요</Text>
      {rooms.loading ? (
        <Loading text="학년과 반을 불러오는 중이에요" />
      ) : rooms.error ? (
        <ErrorNote text={rooms.error} onRetry={rooms.retryable ? rooms.retry : undefined} />
      ) : (
        <>
          <Text style={[styles.sub, { color: palette.sub }]}>
            학년을 여러 개 고를 수 있어요. 아무것도 안 고르면 전 학년에게 보여요.
          </Text>

          {/* 시간표에서 뽑은 내 수업 반이에요. 한 번에 넣어요. */}
          {myRooms.length ? (
            <Tap
              onPress={pickMyRooms}
              accessibilityRole="button"
              accessibilityLabel={`내 수업 반 ${myRooms.join(', ')} 한 번에 고르기`}
              depth={0.04}
              style={[styles.myRooms, { backgroundColor: palette.tint }]}>
              <Text style={[styles.myRoomsText, { color: palette.accentDeep }]}>
                내 수업 반 넣기 ({myRooms.join(', ')})
              </Text>
            </Tap>
          ) : null}
          <View style={styles.chips}>
            <ChipRow>
              {allGrades.map((g) => (
                <Chip
                  key={g}
                  label={`${g}학년`}
                  selected={grades.includes(g)}
                  onPress={() => {
                    const next = toggle(grades, g);
                    setGrades(next);
                    // 학년을 건드리면 콕 집어둔 반은 풀어요. 두 방식이 섞이면
                    // 누구에게 보이는지가 헷갈려요.
                    if (next.length === 0 || exact) setClasses([]);
                  }}
                />
              ))}
            </ChipRow>
          </View>

          {exact ? (
            /*
              내 수업 반을 넣은 상태예요. 여기서 반 번호 칩을 같이 보여주면
              '2-1'과 '1'이 섞여요. 고른 반만 보여주고 빼는 것만 되게 해요.
            */
            <>
              <Text style={[styles.sub, { color: palette.sub }]}>
                이 반에만 보여요. 빼려면 다시 눌러주세요.
              </Text>
              <View style={styles.chips}>
                <ChipRow>
                  {myRooms.map((r) => (
                    <Chip
                      key={r}
                      label={r}
                      selected={classes.includes(r)}
                      onPress={() => {
                        const next = toggle(classes, r);
                        setClasses(next);
                        setGrades([...new Set(next.map((c) => Number(c.split('-')[0])))].sort((a, b) => a - b));
                      }}
                    />
                  ))}
                </ChipRow>
              </View>
            </>
          ) : grades.length > 0 ? (
            <>
              <Text style={[styles.sub, { color: palette.sub }]}>
                반도 여러 개 고를 수 있어요. 안 고르면 그 학년 전체에게 보여요.
              </Text>
              <View style={styles.chips}>
                <ChipRow>
                  {allClasses.map((c) => (
                    <Chip
                      key={c}
                      label={`${c}반`}
                      selected={classes.includes(c)}
                      onPress={() => setClasses(toggle(classes, c))}
                    />
                  ))}
                </ChipRow>
              </View>
            </>
          ) : null}
        </>
      )}

      {kind === 'assessment' ? (
        <>
          <Text style={[styles.label, { color: palette.text }]}>과목</Text>
          <View style={styles.chips}>
            <ChipRow>
              {TEACHABLE.map((s) => (
                <Chip key={s} label={s} colored selected={subject === s} onPress={() => setSubject(s)} />
              ))}
            </ChipRow>
          </View>
        </>
      ) : null}

      <Text style={[styles.label, { color: palette.text }]}>학생에게는 이렇게 보여요</Text>
      <View style={[styles.preview, { backgroundColor: palette.tint }]}>
        <EventRow event={draft} />
      </View>

      {failed ? (
        <View style={[styles.failed, { backgroundColor: palette.tint }]}>
          <Text style={[styles.failedText, { color: palette.text }]}>{failed}</Text>
        </View>
      ) : null}

      <Button
        label={saving ? '등록하는 중이에요' : '일정 등록'}
        icon="check"
        disabled={!title.trim() || saving}
        onPress={save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  sub: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  failed: { borderRadius: 16, padding: 16, marginBottom: 12 },
  failedText: { fontSize: 13, lineHeight: 20 },
  input: { borderRadius: 16, height: 52, paddingHorizontal: 16, marginBottom: 16 },
  detail: {
    borderRadius: 16,
    minHeight: 96,
    padding: 14,
    lineHeight: 22,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
  },
  myRooms: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 16, marginBottom: 12 },
  myRoomsText: { fontSize: 13, fontWeight: '700' },
  dateTap: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14 },
  dateHint: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  clash: { fontSize: 13, lineHeight: 20, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  dateText: { fontSize: 15, fontWeight: '800' },
  chips: { marginBottom: 16, marginRight: -20 },
  preview: { borderRadius: 20, paddingHorizontal: 16, marginBottom: 16 },
});
