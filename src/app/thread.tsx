import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { Reveal, Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { BackHeader, Button, Empty, ErrorNote, Field, IconButton, Loading, Screen } from '@/components/ui';
import { classLabel } from '@/data/mock';
import { getThread } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';
import { PhotoError, pickPhoto, prettySize, type Photo } from '@/lib/photo';
import { shortTime } from '@/lib/time';
import { useRemote } from '@/lib/use-remote';
import { usePoll } from '@/lib/live';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette, role, sendMessage, dropThread, setAnswered, reloadThreads, now } = useApp();
  const insets = useSafeAreaInsets();
  const { content } = useLayout();
  const scrollRef = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  // 지우기는 한 번 더 물어봐요. 되돌릴 수 없으니까요.
  const [confirmDrop, setConfirmDrop] = useState(false);
  // 보내기 전에 고른 사진. 보내고 나면 비워요.
  const [photo, setPhoto] = useState<Photo | null>(null);

  /*
   * 서버에서 통째로 받아와요. 여는 순간 읽음으로 표시돼요.
   *
   * 예전에는 이름에 번호를 섞어서 `thread:1:3` 처럼 만들고, 보낼 때마다
   * 번호를 올려서 다시 읽었어요. 그러면 이름이 매번 달라져서 담아둔 게
   * 소용없어져요. 보낼 때마다 화면이 "불러오는 중"으로 한 번 비었어요.
   * 이름은 그대로 두고 retry 로 다시 읽으면 담아둔 걸 보여주면서 갈려요.
   */
  const remote = useRemote(`thread:${id}`, () => getThread(id));
  const thread = remote.data?.thread ?? null;
  const messages = remote.data?.messages ?? [];

  /*
   * 보고 있는 동안 5초마다 다시 봐요.
   *
   * 상대가 답을 보내도 새로고침을 해야 보였어요. 대화하는 화면에서 그건
   * 좀 그렇죠. 화면을 떠나거나 앱을 내려놓으면 멈춰요.
   */
  usePoll(remote.retry, 5000);

  const teacher = role === 'teacher';
  const subtitle = !thread
    ? undefined
    : teacher
      ? `${thread.student.name} 학생, ${classLabel(thread.student.cls)}${
          thread.student.no ? ` ${thread.student.no}번` : ''
        }`
      : thread.teacher
        ? `${thread.teacher.name} 선생님께`
        : `우리 학교 ${thread.subject} 선생님들께`;

  const send = async () => {
    const v = text.trim();
    // 사진만 보내는 것도 돼요. 글만, 사진만, 둘 다 전부 괜찮아요.
    if ((!v && !photo) || busy) return;
    setBusy(true);
    setFailed(null);
    const problem = await sendMessage(id, v, photo ?? undefined);
    setBusy(false);
    if (problem) {
      setFailed(problem);
      return;
    }
    setText('');
    setPhoto(null);
    remote.retry();
    reloadThreads();
  };

  const attach = async () => {
    setFailed(null);
    try {
      const got = await pickPhoto();
      if (got) setPhoto(got);
    } catch (e) {
      // 우리가 적은 문구만 그대로 띄워요. 그 밖의 것은 영어 개발자 메시지라
      // 화면에 띄워봐야 뭘 하라는 건지 알 수가 없어요.
      setFailed(e instanceof PhotoError ? e.message : '사진을 못 가져왔어요');
    }
  };

  /*
   * 보낸 사람만, 답이 오기 전에만 지울 수 있어요.
   * 선생님이 시간 들여 쓴 답이 한쪽 뜻만으로 사라지면 안 되니까요.
   */
  /*
   * 답이 한 줄이라도 달렸으면 못 지워요. thread.pending 을 보면 안 돼요.
   *
   * pending 의 뜻이 바뀌었거든요. 예전에는 "선생님 답이 없다" 였는데 지금은
   * "선생님이 답변완료를 안 눌렀다" 예요. 그대로 뒀으면 선생님이 답을 써둔
   * 쪽지에 지우기 버튼이 떴을 거예요. 서버는 막으니까 지워지진 않지만,
   * 눌렀다가 거절당하는 버튼이 보이는 것도 좋지 않죠.
   */
  const answeredOnce = messages.some((m) => m.from === 'teacher');
  const canDrop = role === 'student' && !!thread && !answeredOnce;

  /*
   * 답변완료로 표시하거나 되돌려요.
   *
   * 끝났는지는 선생님만 알아요. "잠깐만요, 찾아보고 알려줄게요" 도 답이라
   * 답이 달렸는지로 셀 수가 없어요.
   */
  const answered = async (done: boolean) => {
    setBusy(true);
    setFailed(null);
    const problem = await setAnswered(id, done);
    setBusy(false);
    if (problem) setFailed(problem);
    else remote.retry();
  };

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

      {/*
        안드로이드에도 'padding' 을 줘요.
        옛날 안드로이드는 자판이 올라오면 창을 알아서 줄여줘서 아무것도
        안 해도 됐어요. 지금은 앱이 화면 끝까지 그리는 방식(edge-to-edge)
        이라 창이 안 줄어들어요. 그러면 입력칸이 자판에 덮여요.

        창이 줄어드는 기기에서도 탈은 없어요. 이 값은 '내 아래끝 - 자판
        윗끝' 이라 창이 이미 줄어 있으면 0이 되거든요. 두 번 밀리지 않아요.
      */}
      <KeyboardAvoidingView
        style={styles.fill}
        behavior="padding"
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
                    // 사진만 있으면 안쪽 여백을 줄여요. 사진이 말풍선을 꽉 채우게요.
                    m.image && !m.text && styles.bubblePhotoOnly,
                  ]}>
                  {m.image ? (
                    <Image
                      source={{ uri: m.image }}
                      style={[styles.photo, !m.text && styles.photoOnly]}
                      contentFit="cover"
                      transition={150}
                      accessibilityLabel="보낸 사진"
                    />
                  ) : null}
                  {m.text ? (
                    <Text style={[styles.bubbleText, { color: mine ? palette.onAccent : palette.text }]}>
                      {m.text}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.time, { color: palette.sub }]}>{shortTime(m.at, now)}</Text>
              </Reveal>
            );
          })}
        </ScrollView>

        {failed ? <ErrorNote text={failed} /> : null}

        {/*
          끝났는지를 양쪽에 알려줘요.

          학생에게는 "기다려야 하나 끝난 건가" 가 제일 궁금해요. 선생님이
          답을 적어놓고도 안 눌렀을 수 있으니, 답 줄 수를 세서 짐작하게
          두지 않고 그대로 적어요.
        */}
        {thread.pending ? (
          <Text style={[styles.state, { color: palette.sub }]}>
            {teacher
              ? '아직 답변대기예요. 다 답하셨으면 아래에서 완료로 바꿔주세요.'
              : '선생님 답변을 기다리는 중이에요.'}
          </Text>
        ) : (
          <Text style={[styles.state, { color: palette.accentDeep }]}>
            {thread.answeredBy
              ? `${thread.answeredBy} 선생님이 답변완료로 바꿨어요`
              : '답변완료로 바뀌었어요'}
            {teacher ? '' : '. 더 궁금하면 이어서 물어보세요.'}
          </Text>
        )}

        {/*
          누르는 건 선생님만이에요. 되돌리기도 남겨둬요. 잘못 눌렀을 때 길이
          없으면 그 쪽지는 영영 대기 목록에서 사라져요.
        */}
        {teacher ? (
          <Button
            label={thread.pending ? '답변완료로 바꾸기' : '답변대기로 되돌리기'}
            variant={thread.pending ? 'primary' : 'secondary'}
            disabled={busy}
            onPress={() => answered(thread.pending)}
          />
        ) : null}

        {/* 보내기 전에 어떤 사진인지 보여줘요. 잘못 고른 걸 바로 알 수 있게요. */}
        {photo ? (
          <View style={[styles.attached, { backgroundColor: palette.tint }]}>
            <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" />
            <View style={styles.fill}>
              <Text style={[styles.attachedTitle, { color: palette.text }]}>사진 한 장</Text>
              <Text style={[styles.attachedSize, { color: palette.sub }]}>
                {photo.width}x{photo.height} · {prettySize(photo.bytes)}
              </Text>
            </View>
            <IconButton icon="close" label="사진 빼기" onPress={() => setPhoto(null)} />
          </View>
        ) : null}

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
          <IconButton icon="plus" label="사진 넣기" onPress={attach} disabled={busy || !!photo} />
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
            disabled={(!text.trim() && !photo) || busy}
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
  photo: { width: 220, aspectRatio: 4 / 3, borderRadius: 12, marginBottom: 8 },
  photoOnly: { marginBottom: 0 },
  bubblePhotoOnly: { padding: 4 },
  attached: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  state: { fontSize: 13, lineHeight: 20, marginBottom: 8, textAlign: 'center' },
  attachedTitle: { fontSize: 13, fontWeight: '700' },
  attachedSize: { fontSize: 12, marginTop: 2 },
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
