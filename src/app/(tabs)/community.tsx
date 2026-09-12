import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThreadRow } from '@/components/rows';
import { Text } from '@/components/text';
import { Button, Chip, ChipRow, Empty, ErrorNote, Field, Header, Loading, Screen, SectionTitle, Segmented } from '@/components/ui';
import { TEACHABLE } from '@/lib/subject';
import { getSubjectTeachers, type Thread } from '@/lib/api';
import { isPending, useApp } from '@/lib/app-state';
import { useRemote } from '@/lib/use-remote';

export default function CommunityScreen() {
  const { role } = useApp();
  return role === 'teacher' ? <TeacherInbox /> : <StudentCommunity />;
}

const openThread = (t: Thread) => router.push({ pathname: '/thread', params: { id: t.id } });

/* ---------------- 학생: 질문 보내기 + 내 질문 ---------------- */

function StudentCommunity() {
  const { palette, threads, threadsLoading, askQuestion } = useApp();
  const [subject, setSubject] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canSend = !!subject && text.trim().length > 0 && !busy;

  /*
   * 그 과목을 맡은 우리 학교 선생님들.
   *
   * 계정이 있는 분만 나와요. 아직 아무도 가입 안 한 과목이면 빈 목록이고,
   * 그때는 예전처럼 그 과목 선생님 모두에게 가도록 둬요. 고를 게 없는데
   * 고르라고 막아 세우면 질문을 아예 못 보내잖아요.
   */
  const staff = useRemote(`teachers:${subject ?? ''}`, () =>
    subject ? getSubjectTeachers(subject) : Promise.resolve([]),
  );
  const list = staff.data ?? [];
  const picked = list.find((t) => t.id === teacher) ?? null;

  const send = async () => {
    if (!subject || !canSend) return;
    setBusy(true);
    setFailed(null);
    const problem = await askQuestion(subject, text.trim(), teacher ?? undefined);
    setBusy(false);
    if (problem) {
      setFailed(problem);
      return;
    }
    setSentTo(
      picked
        ? `${picked.name} 선생님께 쪽지를 보냈어요`
        : `${subject} 선생님께 쪽지를 보냈어요`,
    );
    setText('');
    setSubject(null);
    setTeacher(null);
  };

  return (
    <Screen>
      <Header subtitle="선생님께 묻고 답을 받아요" title="커뮤니티" />

      <SectionTitle title="선생님께 질문하기" />
      <Text style={[styles.help, { color: palette.sub }]}>
        과목을 고르면 그 과목 선생님께 쪽지가 전달돼요.
      </Text>

      <View style={styles.subjects}>
        <ChipRow>
          {TEACHABLE.map((s) => (
            <Chip
              key={s}
              label={s}
              colored
              selected={subject === s}
              onPress={() => {
                setSubject(s);
                // 과목이 바뀌면 고른 선생님은 지워요. 그 과목 선생님이 아니니까요.
                setTeacher(null);
                setSentTo(null);
              }}
            />
          ))}
        </ChipRow>
      </View>

      {subject && staff.loading ? (
        <Text style={[styles.to, { color: palette.sub }]}>선생님을 찾는 중이에요</Text>
      ) : null}

      {/* 고를 수 있는 선생님이 있으면 한 분만 골라서 보낼 수 있어요.
          수학 선생님이 여섯 분인데 전부에게 가면 아무도 자기 일로 안 봐요. */}
      {subject && !staff.loading && list.length > 0 ? (
        <>
          <Text style={[styles.pickLabel, { color: palette.text }]}>어느 선생님께 보낼까요?</Text>
          <View style={styles.subjects}>
            <ChipRow>
              <Chip
                label={`${subject} 선생님 모두`}
                selected={teacher === null}
                onPress={() => setTeacher(null)}
              />
              {list.map((t) => (
                <Chip
                  key={t.id}
                  label={`${t.name} 선생님`}
                  selected={teacher === t.id}
                  onPress={() => setTeacher(t.id)}
                />
              ))}
            </ChipRow>
          </View>
          <Text style={[styles.to, { color: palette.accentDeep }]}>
            {picked
              ? `${picked.name} 선생님께만 가요${picked.teaches.length ? ` · ${picked.teaches.join(', ')}` : ''}`
              : `우리 학교 ${subject} 선생님 ${list.length}분께 모두 가요`}
          </Text>
        </>
      ) : null}

      {/* 계정이 있는 선생님이 없으면 고를 게 없어요. 그래도 보낼 수는 있고,
          나중에 그 과목 선생님이 가입하면 그때 쪽지함에 보여요. */}
      {subject && !staff.loading && list.length === 0 ? (
        <Text style={[styles.to, { color: palette.sub }]}>
          우리 학교 {subject} 선생님은 아직 가입하지 않았어요. 보내두면 가입하는 대로 전달돼요.
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
        label={
          busy
            ? '보내는 중이에요'
            : picked
              ? `${picked.name} 선생님께 보내기`
              : subject
                ? `${subject} 선생님께 보내기`
                : '과목을 먼저 골라주세요'
        }
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
          me?.teaches?.length
            ? `${me.teaches.join(', ')} 맡고 계세요`
            : me?.subjects.length
              ? `${me.subjects.join(', ')} 과목으로 온 쪽지`
              : '담당 과목으로 온 쪽지'
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
  pickLabel: { fontSize: 15, fontWeight: '800', marginTop: 20 },
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
