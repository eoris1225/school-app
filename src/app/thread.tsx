import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Reveal, Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { BackHeader, Empty, ErrorNote, Field, IconButton, Loading, Screen } from '@/components/ui';
import { classLabel } from '@/data/mock';
import { getThread } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';
import { shortTime } from '@/lib/time';
import { useRemote } from '@/lib/use-remote';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette, role, sendMessage, dropThread, reloadThreads, now } = useApp();
  const insets = useSafeAreaInsets();
  const { content } = useLayout();
  const scrollRef = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  // 답장을 보낸 뒤 이 값을 올려서 다시 읽어와요.
  const [nonce, setNonce] = useState(0);
  // 지우기는 한 번 더 물어봐요. 되돌릴 수 없으니까요.
  const [confirmDrop, setConfirmDrop] = useState(false);

  // 서버에서 통째로 받아와요. 여는 순간 읽음으로 표시돼요.
  const remote = useRemote(`thread:${id}:${nonce}`, () => getThread(id));
  const thread = remote.data?.thread ?? null;
  const messages = remote.data?.messages ?? [];

  const teacher = role === 'teacher';
  const subtitle = !thread
    ? undefined
    : teacher
      ? `${thread.student.name} 학생, ${classLabel(thread.student.cls)}${
          thread.student.no ? ` ${thread.student.no}번` : ''
        }`
      : `우리 학교 ${thread.subject} 선생님들께`;

  const send = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    setFailed(null);
    const problem = await sendMessage(id, v);
    setBusy(false);
    if (problem) {
      setFailed(problem);
      return;
    }
    setText('');
    setNonce((n) => n + 1);
    reloadThreads();
  };

  /*
   * 보낸 사람만, 답이 오기 전에만 지울 수 있어요.
   * 선생님이 시간 들여 쓴 답이 한쪽 뜻만으로 사라지면 안 되니까요.
   */
  const canDrop = role === 'student' && !!thread && thread.pending;

  const drop = async () => {
    setBusy(true);
    setFailed(null);
    const problem = await dropThread(id);
    setBusy(false);
    if (problem) {
      setFailed(problem);
      setConfirmDrop(false);
      return;
    }
    router.back();
  };

  if (remote.loading) {
    return (
      <Screen bottomInset>
        <BackHeader title="쪽지" />
        <Loading text="쪽지를 불러오는 중이에요" rows={3} />
      </Screen>
    );
  }

  if (remote.error || !thread) {
    return (
      <Screen bottomInset>
        <BackHeader title="쪽지" />
        {remote.retryable ? (
          <ErrorNote text={remote.error ?? '쪽지를 찾을 수 없어요'} onRetry={remote.retry} />
        ) : (
          <Empty art="chat" text="쪽지를 찾을 수 없어요" hint="지워졌거나 볼 수 없는 쪽지예요." />
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <BackHeader
        title={`${thread.subject} 질문`}
        subtitle={subtitle}
        right={
          canDrop ? (
            <IconButton
              icon="trash"
              label="이 질문 거둬들이기"
              onPress={() => setConfirmDrop(true)}
            />
          ) : null
        }
      />

      {/* 한 번 더 물어봐요. 누르자마자 사라지면 실수를 되돌릴 수 없어요. */}
      {confirmDrop ? (
        <View style={[styles.confirm, { backgroundColor: palette.tint }]}>
          <Text style={[styles.confirmText, { color: palette.text }]}>
            이 질문을 거둬들일까요? 보낸 내용이 사라지고 선생님 쪽지함에서도 없어져요.
          </Text>
          <View style={styles.confirmRow}>
            <Tap
              onPress={() => setConfirmDrop(false)}
              accessibilityRole="button"
              accessibilityLabel="그대로 두기"
              depth={0.05}
              style={[styles.confirmBtn, { borderColor: palette.line }]}>
              <Text style={[styles.confirmBtnText, { color: palette.text }]}>그대로 두기</Text>
            </Tap>
            <Tap
              onPress={drop}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="거둬들이기"
              depth={0.05}
              style={[styles.confirmBtn, { backgroundColor: palette.accent, borderColor: palette.accent }]}>
              <Text style={[styles.confirmBtnText, { color: palette.onAccent }]}>
                {busy ? '지우는 중이에요' : '거둬들이기'}
              </Text>
            </Tap>
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <ScrollView
          ref={scrollRef}
          style={styles.fill}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}>
          {messages.map((m, i) => {
            const mine = m.from === role;
            return (
              <Reveal key={m.id} delay={Math.min(i, 6) * 40} distance={8}
                style={[styles.msgRow, mine ? styles.mine : styles.theirs]}>
                {!mine ? (
                  <Text style={[styles.author, { color: palette.sub }]}>
                    {m.author} {m.from === 'teacher' ? '선생님' : '학생'}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? { backgroundColor: palette.accent, borderBottomRightRadius: 6 }
                      : { backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1.5, borderBottomLeftRadius: 6 },
                  ]}>
                  <Text style={[styles.bubbleText, { color: mine ? palette.onAccent : palette.text }]}>{m.text}</Text>
                </View>
                <Text style={[styles.time, { color: palette.sub }]}>{shortTime(m.at, now)}</Text>
              </Reveal>
            );
          })}
        </ScrollView>

        {failed ? <ErrorNote text={failed} /> : null}

        <View
          style={[
            styles.composer,
            {
              maxWidth: content,
              borderTopColor: palette.line,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: palette.bg,
            },
          ]}>
          <Field
            value={text}
            onChangeText={(v) => {
              setText(v);
              setFailed(null);
            }}
            placeholder={teacher ? '답변을 적어주세요' : '더 궁금한 점을 적어주세요'}
            multiline
            accessibilityLabel={teacher ? '답변 내용' : '메시지 내용'}
            style={styles.input}
          />
          <IconButton
            icon="send"
            label={teacher ? '답변 보내기' : '보내기'}
            filled
            disabled={!text.trim() || busy}
            onPress={send}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  messages: { paddingVertical: 8, gap: 12 },
  msgRow: { maxWidth: '82%', gap: 4 },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  author: { fontSize: 12, fontWeight: '700' },
  bubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  time: { fontSize: 12 },
  confirm: { borderRadius: 18, padding: 16, marginBottom: 8 },
  confirmText: { fontSize: 13, lineHeight: 20 },
  confirmRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  confirmBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { fontSize: 13, fontWeight: '700' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1.5,
    width: '100%',
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 22,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
});
