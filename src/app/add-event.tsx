import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EventRow } from '@/components/rows';
import { Text } from '@/components/text';
import { BackHeader, Button, Chip, ChipRow, Empty, ErrorNote, Field, goBack, IconButton, Loading, Screen, Segmented } from '@/components/ui';
import { SUBJECTS, type EventKind, type Subject } from '@/data/mock';
import { getClasses } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { addDays, formatDay, fromYmd, toYmd } from '@/lib/time';
import { useRemote } from '@/lib/use-remote';

/** 이미 골라둔 목록에서 하나를 켜고 끄는 걸 반복해요. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function AddEventScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const { palette, role, now, addEvent, school, me } = useApp();
  // 내 담당 과목을 처음부터 골라둬요. 과목 선생님이 제일 자주 쓰는 값이에요.
  const myFirstSubject =
    (me?.subjects.find((s): s is Subject => (SUBJECTS as readonly string[]).includes(s)) ??
      SUBJECTS[0]);
  const [kind, setKind] = useState<EventKind>('academic');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => (params.date ? fromYmd(params.date) : now));
  const [grades, setGrades] = useState<number[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [subject, setSubject] = useState<Subject>(myFirstSubject);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  // 학년·반 목록은 그 학교 실제 목록에서 가져와요. 학교마다 반 개수가 달라요.
  const year = now.getFullYear();
  const rooms = useRemote(`add-classes:${school?.code}:${year}`, () =>
    getClasses(year, school ?? undefined),
  );
  const allGrades = [...new Set((rooms.data ?? []).map((r) => r.grade))].sort((a, b) => a - b);
  // 고른 학년들에 실제로 있는 반만 보여줘요.
  const allClasses = [
    ...new Set(
      (rooms.data ?? []).filter((r) => grades.includes(r.grade)).map((r) => r.cls),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));

  if (role !== 'teacher') {
    return (
      <Screen bottomInset>
        <BackHeader title="일정 추가" />
        <Empty text="일정은 선생님만 추가할 수 있어요" />
      </Screen>
    );
  }

  const draft = {
    id: 'preview',
    date: toYmd(date),
    title: title.trim() || '일정 제목',
    kind,
    subject: kind === 'assessment' ? subject : undefined,
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

      <Text style={[styles.label, { color: palette.text }]}>날짜</Text>
      <View style={[styles.dateRow, { backgroundColor: palette.tint }]}>
        <IconButton icon="back" label="하루 전" onPress={() => setDate((d) => addDays(d, -1))} />
        <Text style={[styles.dateText, { color: palette.text }]}>{formatDay(date)}</Text>
        <IconButton icon="next" label="하루 뒤" onPress={() => setDate((d) => addDays(d, 1))} />
      </View>

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
                    // 학년을 빼면 그 학년에만 있던 반도 같이 빼요.
                    if (next.length === 0) setClasses([]);
                  }}
                />
              ))}
            </ChipRow>
          </View>

          {grades.length > 0 ? (
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
              {SUBJECTS.map((s) => (
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
  },
  dateText: { fontSize: 15, fontWeight: '800' },
  chips: { marginBottom: 16, marginRight: -20 },
  preview: { borderRadius: 20, paddingHorizontal: 16, marginBottom: 16 },
});
