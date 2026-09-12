import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Emoji, subjectArt, type EmojiName } from '@/components/emoji';
import { Icon } from '@/components/icon';
import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Tag } from '@/components/ui';
import { classLabel, targetLabel, type SchoolEvent } from '@/data/mock';
import { type Thread } from '@/lib/api';
import { isPending, useApp } from '@/lib/app-state';
import { dday, fromYmd, shortTime } from '@/lib/time';

/**
 * 일정 한 줄: 왼쪽 날짜, 가운데 제목, 오른쪽 D-day
 *
 * 선생님이 자세한 내용을 적어뒀으면 눌러서 펼칠 수 있어요. 준비물이나
 * 시험 범위 같은 거요. 목록에 늘 펼쳐두면 줄이 길어져서 훑기 어려워요.
 */
export function EventRow({
  event,
  onDelete,
  showDday = true,
}: {
  event: SchoolEvent;
  onDelete?: () => void;
  showDday?: boolean;
}) {
  const { palette, now } = useApp();
  const [open, setOpen] = useState(false);
  const detail = event.detail?.trim();
  const date = fromYmd(event.date);
  const d = dday(event.date, now);
  const kindLabel =
    event.kind === 'assessment'
      ? `수행평가 ${event.subject ?? ''}`.trim()
      : event.kind === 'personal'
        ? '내 일정'
        : '학사일정';
  // 수행평가는 그 과목 그림, 내 일정은 압정, 학사일정은 달력이에요.
  const art: EmojiName =
    event.kind === 'assessment'
      ? subjectArt(event.subject ?? '')
      : event.kind === 'personal'
        ? 'pin'
        : 'calendar';
  /*
   * 수행평가만 색으로 둬요.
   *
   * 학사일정은 거의 매일 있어서 전부 색으로 두면 목록이 알록달록해지고,
   * 정작 놓치면 곤란한 수행평가가 묻혀요. 색은 "이건 챙겨야 해요"라는
   * 뜻으로만 써요.
   */
  const loud = event.kind === 'assessment';

  const row = (
    <View style={styles.eventRow}>
      <View style={styles.eventDate}>
        <Emoji name={art} size={26} tone={loud ? 'color' : 'mono'} />
        <Text numeric style={[styles.eventDay, { color: palette.sub }]}>
          {date.getMonth() + 1}/{date.getDate()}
        </Text>
      </View>
      <View style={styles.eventBody}>
        <Text style={[styles.eventTitle, { color: palette.text }]}>{event.title}</Text>
        <View style={styles.eventMeta}>
          <Tag
            label={kindLabel}
            tone="plain"
            subject={
              event.kind === 'assessment'
                ? (event.subject ?? '수행평가')
                : event.kind === 'personal'
                  ? '내 일정'
                  : '학사일정'
            }
          />
          <Text style={[styles.eventTarget, { color: palette.sub }]}>{targetLabel(event)}</Text>
          {/* 적어둔 게 있으면 있다고 알려줘야 눌러봐요. */}
          {detail ? (
            <View style={styles.hasDetail}>
              <Icon name={open ? 'up' : 'down'} size={14} color={palette.accentDeep} />
              <Text style={[styles.hasDetailText, { color: palette.accentDeep }]}>
                {open ? '접기' : '안내'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {showDday ? (
        <Text style={[styles.dday, { color: d === '오늘' ? palette.accent : palette.accentDeep }]}>{d}</Text>
      ) : null}
      {onDelete ? (
        <Tap
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`${event.title} 일정 삭제`}
          hitSlop={8}
          depth={0.1}
          style={[styles.deleteBtn, { borderColor: palette.line }]}>
          <Icon name="trash" size={20} color={palette.sub} />
        </Tap>
      ) : null}
    </View>
  );

  if (!detail) return row;

  return (
    <View>
      <Tap
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${event.title}, 자세한 내용 ${open ? '접기' : '보기'}`}
        depth={0.015}>
        {row}
      </Tap>
      {open ? (
        <View style={[styles.detail, { backgroundColor: palette.tint }]}>
          <Text style={[styles.detailText, { color: palette.text }]}>{detail}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** 쪽지 목록 한 줄 */
export function ThreadRow({ thread, onPress }: { thread: Thread; onPress: () => void }) {
  const { palette, role } = useApp();
  const last = thread.last;
  const pending = isPending(thread);
  const unread = thread.unread;
  /*
   * 예전에는 "박지현 선생님" 처럼 이름을 보여줬는데 지어낸 이름이었어요.
   * 콕 집어 보낸 쪽지면 그분 이름이 진짜로 있으니 그걸 보여주고,
   * 과목 선생님 모두에게 보냈으면 답이 오기 전까지는 누가 답할지 몰라요.
   * 그때는 과목만 적어두고, 답이 오면 실제로 답한 분 이름으로 바꿔요.
   */
  const title =
    role === 'teacher'
      ? `${thread.student.name} 학생`
      : last?.from === 'teacher'
        ? `${last.author} 선생님`
        : thread.teacher
          ? `${thread.teacher.name} 선생님께`
          : `${thread.subject} 선생님께`;
  const subTitle =
    role === 'teacher'
      ? `${classLabel(thread.student.cls)}${thread.student.no ? ` ${thread.student.no}번` : ''}`
      : null;

  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${thread.subject} 쪽지, ${title}, ${pending ? '답변 대기' : '답변 완료'}${unread ? ', 새 소식' : ''}`}
      depth={0.015}
      style={[styles.threadRow, { borderBottomColor: palette.line }]}>
      <View style={styles.threadTop}>
        <Tag label={thread.subject} subject={thread.subject} />
        <Text style={[styles.threadTitle, { color: palette.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subTitle ? <Text style={[styles.threadSub, { color: palette.sub }]}>{subTitle}</Text> : null}
        <View style={styles.fill} />
        {unread ? <View style={[styles.unreadDot, { backgroundColor: palette.accent }]} /> : null}
      </View>
      <Text style={[styles.threadPreview, { color: palette.text }]} numberOfLines={2}>
        {!last ? '' : last.from === 'teacher' && role === 'student' ? `답변: ${last.text}` : last.text}
      </Text>
      <View style={styles.threadBottom}>
        <Text style={[styles.threadStatus, { color: pending ? palette.sub : palette.accentDeep }]}>
          {pending ? '답변 대기' : '답변 완료'}
        </Text>
        <Text style={[styles.threadTime, { color: palette.sub }]}>{shortTime(thread.at)}</Text>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  eventDate: { width: 44, alignItems: 'center', gap: 4 },
  eventDay: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  eventBody: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 13, fontWeight: '700', lineHeight: 22 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  eventTarget: { fontSize: 12, fontWeight: '500' },
  hasDetail: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  hasDetailText: { fontSize: 12, fontWeight: '700' },
  detail: { borderRadius: 16, padding: 14, marginBottom: 12 },
  detailText: { fontSize: 14, lineHeight: 22 },
  dday: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  threadRow: { borderBottomWidth: 1, paddingVertical: 16, gap: 8 },
  threadTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  threadTitle: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  threadSub: { fontSize: 12, fontWeight: '500' },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
  threadPreview: { fontSize: 13, lineHeight: 21 },
  threadBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  threadStatus: { fontSize: 12, fontWeight: '700' },
  threadTime: { fontSize: 12 },
});
