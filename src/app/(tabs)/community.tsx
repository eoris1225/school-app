import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThreadRow } from '@/components/rows';
import { Button, Card, Chip, ChipRow, Empty, Field, Header, Screen, SectionTitle, Segmented } from '@/components/ui';
import { SUBJECT_TEACHERS, SUBJECTS, TEACHER, type Subject, type Thread } from '@/data/mock';
import { isPending, useApp } from '@/lib/app-state';

export default function CommunityScreen() {
  const { role } = useApp();
  return role === 'teacher' ? <TeacherInbox /> : <StudentCommunity />;
}

const openThread = (t: Thread) => router.push({ pathname: '/thread', params: { id: t.id } });

/* ---------------- 학생: 질문 보내기 + 내 질문 ---------------- */

function StudentCommunity() {
  const { palette, threads, askQuestion } = useApp();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [text, setText] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const canSend = !!subject && text.trim().length > 0;

  const send = () => {
    if (!subject || !canSend) return;
    askQuestion(subject, text.trim());
    setSentTo(`${subject} 선생님께 쪽지를 보냈어요`);
    setText('');
    setSubject(null);
  };

  return (
    <Screen>
      <Header subtitle="선생님께 묻고 답을 받아요" title="커뮤니티" />

      <Card>
        <Text style={[styles.cardTitle, { color: palette.text }]}>선생님께 질문하기</Text>
        <Text style={[styles.help, { color: palette.sub }]}>과목을 고르면 그 과목 선생님들께 쪽지가 전달돼요.</Text>

        <View style={styles.subjects}>
          <ChipRow>
            {SUBJECTS.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={subject === s}
                onPress={() => {
                  setSubject(s);
                  setSentTo(null);
                }}
              />
            ))}
          </ChipRow>
        </View>

        {subject ? (
          <Text style={[styles.to, { color: palette.accentDeep }]}>
            받는 사람: {SUBJECT_TEACHERS[subject].join(', ')} 선생님
          </Text>
        ) : null}

        <Field
          value={text}
          onChangeText={(v) => {
            setText(v);
            setSentTo(null);
          }}
          placeholder="궁금한 내용을 적어주세요"
          multiline
          accessibilityLabel="질문 내용"
          style={styles.input}
        />
        <Button label={subject ? `${subject} 선생님께 보내기` : '과목을 먼저 골라주세요'} icon="send" disabled={!canSend} onPress={send} />
        {sentTo ? <Text style={[styles.sent, { color: palette.accentDeep }]}>{sentTo}</Text> : null}
      </Card>

      <SectionTitle title="내 질문" />
      {threads.length === 0 ? <Empty text="아직 보낸 질문이 없어요" /> : null}
      {threads.map((t) => (
        <ThreadRow key={t.id} thread={t} onPress={() => openThread(t)} />
      ))}
    </Screen>
  );
}

/* ---------------- 선생님: 쪽지함 ---------------- */

function TeacherInbox() {
  const { threads } = useApp();
  const [tab, setTab] = useState<'pending' | 'done' | 'all'>('pending');
  const pending = threads.filter(isPending);
  const done = threads.filter((t) => !isPending(t));
  const list = tab === 'pending' ? pending : tab === 'done' ? done : threads;

  return (
    <Screen>
      <Header subtitle={`${TEACHER.subjects.join(', ')} 과목으로 온 쪽지`} title="쪽지함" />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: `답변 대기 ${pending.length}` },
          { value: 'done', label: '답변 완료' },
          { value: 'all', label: '전체' },
        ]}
      />
      {list.length === 0 ? (
        <Empty text={tab === 'pending' ? '답변을 기다리는 쪽지가 없어요' : '쪽지가 없어요'} />
      ) : null}
      {list.map((t) => (
        <ThreadRow key={t.id} thread={t} onPress={() => openThread(t)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 18, fontWeight: '800' },
  help: { fontSize: 15, lineHeight: 21, marginTop: 4 },
  subjects: { marginTop: 14, marginHorizontal: -18, paddingLeft: 18 },
  to: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  input: {
    borderRadius: 16,
    minHeight: 110,
    padding: 14,
    lineHeight: 23,
    textAlignVertical: 'top',
    marginTop: 12,
    marginBottom: 12,
  },
  sent: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 12 },
});
