import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EventRow } from '@/components/rows';
import { Text } from '@/components/text';
import { BackHeader, Button, Card, Chip, ChipRow, Empty, Field, goBack, IconButton, Screen, Segmented } from '@/components/ui';
import { classLabel, SUBJECTS, TEACHER, type EventKind, type Subject } from '@/data/mock';
import { useApp } from '@/lib/app-state';
import { addDays, formatDay, fromYmd, toYmd } from '@/lib/time';

const TARGETS = ['전체', '1학년', '2학년', '3학년', classLabel(TEACHER.homeroom)];

export default function AddEventScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const { palette, role, now, addEvent } = useApp();
  const [kind, setKind] = useState<EventKind>('academic');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => (params.date ? fromYmd(params.date) : now));
  const [target, setTarget] = useState('전체');
  const [subject, setSubject] = useState<Subject>(TEACHER.subjects[0]);

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
    target,
  };

  const save = () => {
    addEvent({ date: draft.date, title: title.trim(), kind, subject: draft.subject, target });
    goBack();
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
      <View style={[styles.dateRow, { borderColor: palette.line }]}>
        <IconButton icon="back" label="하루 전" onPress={() => setDate((d) => addDays(d, -1))} />
        <Text style={[styles.dateText, { color: palette.text }]}>{formatDay(date)}</Text>
        <IconButton icon="next" label="하루 뒤" onPress={() => setDate((d) => addDays(d, 1))} />
      </View>

      <Text style={[styles.label, { color: palette.text }]}>누구에게 보일까요</Text>
      <View style={styles.chips}>
        <ChipRow>
          {TARGETS.map((t) => (
            <Chip key={t} label={t} selected={target === t} onPress={() => setTarget(t)} />
          ))}
        </ChipRow>
      </View>

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
      <Card style={styles.preview}>
        <EventRow event={draft} />
      </Card>

      <Button label="일정 등록" icon="check" disabled={!title.trim()} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: '800', marginBottom: 8, marginTop: 6 },
  input: { borderRadius: 16, height: 52, paddingHorizontal: 16, marginBottom: 16 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 6,
    marginBottom: 16,
  },
  dateText: { fontSize: 17, fontWeight: '800' },
  chips: { marginBottom: 16, marginRight: -20 },
  preview: { paddingVertical: 4 },
});
