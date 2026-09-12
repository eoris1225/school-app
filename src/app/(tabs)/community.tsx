import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThreadRow } from '@/components/rows';
import { Text } from '@/components/text';
import { Button, Chip, ChipRow, Empty, ErrorNote, Field, Header, Loading, Screen, SectionTitle, Segmented } from '@/components/ui';
import { SUBJECTS, type Subject } from '@/data/mock';
import { type Thread } from '@/lib/api';
import { isPending, useApp } from '@/lib/app-state';

export default function CommunityScreen() {
  const { role } = useApp();
  return role === 'teacher' ? <TeacherInbox /> : <StudentCommunity />;
}

const openThread = (t: Thread) => router.push({ pathname: '/thread', params: { id: t.id } });

/* ---------------- 학생: 질문 보내기 + 내 질문 ---------------- */

function StudentCommunity() {
  const { palette, threads, threadsLoading, askQuestion } = useApp();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [text, setText] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canSend = !!subject && text.trim().length > 0 && !busy;

  const send = async () => {
    if (!subject || !canSend) return;
    setBusy(true);
    setFailed(null);
    const problem = await askQuestion(subject, text.trim());
    setBusy(false);
    if (problem) {
      setFailed(problem);
      return;
    }
    setSentTo(`${subject} 선생님께 쪽지를 보냈어요`);
    setText('');
    setSubject(null);
  };

  return (
    <Screen>
      <Header subtitle="선생님께 묻고 답을 받아요" title="커뮤니티" />

      <SectionTitle title="선생님께 질문하기" />
      <Text style={[styles.help, { color: palette.sub }]}>과목을 고르면 그 과목 선생님들께 쪽지가 전달돼요.</Text>

        <View style={styles.subjects}>
          <ChipRow>
            {SUBJECTS.map((s) => (
              <Chip
                key={s}
                label={s}
                colored
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
          // 누가 답할지는 보낼 때 알 수 없어요. 그 과목 선생님 여럿이 받거든요.
          // 예전에는 지어낸 이름을 보여줬는데 없앴어요.
          <Text style={[styles.to, { color: palette.accentDeep }]}>
            우리 학교 {subject} 선생님들께 가요
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
        <Button
          label={busy ? '보내는 중이에요' : subject ? `${subject} 선생님께 보내기` : '과목을 먼저 골라주세요'}
          icon="send"
          disabled={!canSend}
          onPress={send}
        />
      {failed ? <ErrorNote text={failed} /> : null}
      {sentTo ? <Text style={[styles.sent, { color: palette.accentDeep }]}>{sentTo}</Text> : null}

      <SectionTitle title="내 질문" />
      {threadsLoading ? <Loading text="쪽지를 불러오는 중이에요" rows={2} /> : null}
      {!threadsLoading && threads.length === 0 ? (
        <Empty art="chat" text="아직 보낸 질문이 없어요" hint="궁금한 과목을 고르고 위에 적어서 보내보세요." />
      ) : null}
      {threads.map((t) => (
        <ThreadRow key={t.id} thread={t} onPress={() => openThread(t)} />
      ))}
    </Screen>
  );
}

/* ---------------- 선생님: 쪽지함 ---------------- */

function TeacherInbox() {
  const { threads, threadsLoading, me } = useApp();
  const [tab, setTab] = useState<'pending' | 'done' | 'all'>('pending');
  const pending = threads.filter(isPending);
  const done = threads.filter((t) => !isPending(t));
  const list = tab === 'pending' ? pending : tab === 'done' ? done : threads;

  return (
    <Screen>
      <Header
        subtitle={
          me?.subjects.length ? `${me.subjects.join(', ')} 과목으로 온 쪽지` : '담당 과목으로 온 쪽지'
        }
        title="쪽지함"
      />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: `답변 대기 ${pending.length}` },
          { value: 'done', label: '답변 완료' },
          { value: 'all', label: '전체' },
        ]}
      />
      {threadsLoading ? <Loading text="쪽지를 불러오는 중이에요" rows={3} /> : null}
      {!threadsLoading && list.length === 0 ? (
        <Empty
          art="inbox"
          text={tab === 'pending' ? '답변을 기다리는 쪽지가 없어요' : '쪽지가 없어요'}
          hint={tab === 'pending' ? '새 쪽지가 오면 여기에 쌓여요.' : undefined}
        />
      ) : null}
      {list.map((t) => (
        <ThreadRow key={t.id} thread={t} onPress={() => openThread(t)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  subjects: { marginTop: 12, marginHorizontal: -20, paddingLeft: 20 },
  to: { fontSize: 13, fontWeight: '700', marginTop: 12 },
  input: {
    borderRadius: 16,
    minHeight: 110,
    padding: 12,
    lineHeight: 21,
    textAlignVertical: 'top',
    marginTop: 12,
    marginBottom: 12,
  },
  sent: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 12 },
});
