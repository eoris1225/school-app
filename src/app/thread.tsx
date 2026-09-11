import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { BackHeader, Empty, Field, IconButton, Screen } from '@/components/ui';
import { classLabel, SUBJECT_TEACHERS } from '@/data/mock';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette, role, threads, sendMessage, markRead } = useApp();
  const insets = useSafeAreaInsets();
  const { content } = useLayout();
  const scrollRef = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const thread = threads.find((t) => t.id === id);

  useEffect(() => {
    if (id) markRead(id);
  }, [id, markRead]);

  if (!thread) {
    return (
      <Screen bottomInset>
        <BackHeader title="쪽지" />
        <Empty text="쪽지를 찾을 수 없어요" />
      </Screen>
    );
  }

  const teacher = role === 'teacher';
  const subtitle = teacher
    ? `${thread.student.name} 학생, ${classLabel(thread.student.cls)}`
    : `받는 사람: ${SUBJECT_TEACHERS[thread.subject].join(', ')} 선생님`;

  const send = () => {
    const v = text.trim();
    if (!v) return;
    sendMessage(thread.id, v);
    setText('');
  };

  return (
    <Screen scroll={false}>
      <BackHeader title={`${thread.subject} 질문`} subtitle={subtitle} />
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
          {thread.messages.map((m) => {
            const mine = m.from === role;
            return (
              <View key={m.id} style={[styles.msgRow, mine ? styles.mine : styles.theirs]}>
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
                <Text style={[styles.time, { color: palette.sub }]}>{m.time}</Text>
              </View>
            );
          })}
        </ScrollView>

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
            onChangeText={setText}
            placeholder={teacher ? '답변을 적어주세요' : '더 궁금한 점을 적어주세요'}
            multiline
            accessibilityLabel={teacher ? '답변 내용' : '메시지 내용'}
            style={styles.input}
          />
          <IconButton icon="send" label={teacher ? '답변 보내기' : '보내기'} filled disabled={!text.trim()} onPress={send} />
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
