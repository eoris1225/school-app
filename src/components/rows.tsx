import { StyleSheet, Text, View, Pressable } from 'react-native';

import { Icon } from '@/components/icon';
import { Tag } from '@/components/ui';
import { classLabel, SUBJECT_TEACHERS, type SchoolEvent, type Thread } from '@/data/mock';
import { isPending, useApp } from '@/lib/app-state';
import { dday, fromYmd } from '@/lib/time';

/** 일정 한 줄: 왼쪽 날짜, 가운데 제목, 오른쪽 D-day */
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
  const date = fromYmd(event.date);
  const d = dday(event.date, now);
  const kindLabel = event.kind === 'assessment' ? `수행평가 ${event.subject ?? ''}`.trim() : '학사일정';

  return (
    <View style={styles.eventRow}>
      <View style={styles.eventDate}>
        <Text style={[styles.eventDay, { color: palette.text }]}>{date.getDate()}</Text>
        <Text style={[styles.eventMonth, { color: palette.sub }]}>{date.getMonth() + 1}월</Text>
      </View>
      <View style={styles.eventBody}>
        <Text style={[styles.eventTitle, { color: palette.text }]}>{event.title}</Text>
        <View style={styles.eventMeta}>
          <Tag label={kindLabel} tone={event.kind === 'assessment' ? 'solid' : 'soft'} />
          <Text style={[styles.eventTarget, { color: palette.sub }]}>{event.target}</Text>
        </View>
      </View>
      {showDday ? (
        <Text style={[styles.dday, { color: d === '오늘' ? palette.accent : palette.accentDeep }]}>{d}</Text>
      ) : null}
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`${event.title} 일정 삭제`}
          hitSlop={8}
          style={({ pressed }) => [styles.deleteBtn, { borderColor: palette.line }, pressed && { opacity: 0.6 }]}>
          <Icon name="trash" size={20} color={palette.sub} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** 쪽지 목록 한 줄 */
export function ThreadRow({ thread, onPress }: { thread: Thread; onPress: () => void }) {
  const { palette, role } = useApp();
  const last = thread.messages[thread.messages.length - 1];
  const pending = isPending(thread);
  const unread = role === 'teacher' ? thread.unreadTeacher : thread.unreadStudent;
  const answeredBy = [...thread.messages].reverse().find((m) => m.from === 'teacher')?.author;
  const title =
    role === 'teacher'
      ? `${thread.student.name} 학생`
      : answeredBy
        ? `${answeredBy} 선생님`
        : `${SUBJECT_TEACHERS[thread.subject].join(', ')} 선생님`;
  const subTitle = role === 'teacher' ? classLabel(thread.student.cls) : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${thread.subject} 쪽지, ${title}, ${pending ? '답변 대기' : '답변 완료'}${unread ? ', 새 소식' : ''}`}
      style={({ pressed }) => [styles.threadRow, { borderColor: palette.line }, pressed && { opacity: 0.6 }]}>
      <View style={styles.threadTop}>
        <Tag label={thread.subject} tone="soft" />
        <Text style={[styles.threadTitle, { color: palette.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subTitle ? <Text style={[styles.threadSub, { color: palette.sub }]}>{subTitle}</Text> : null}
        <View style={styles.fill} />
        {unread ? <View style={[styles.unreadDot, { backgroundColor: palette.accent }]} /> : null}
      </View>
      <Text style={[styles.threadPreview, { color: palette.text }]} numberOfLines={2}>
        {last.from !== role && role === 'student' ? `답변: ${last.text}` : last.text}
      </Text>
      <View style={styles.threadBottom}>
        <Text style={[styles.threadStatus, { color: pending ? palette.sub : palette.accentDeep }]}>
          {pending ? '답변 대기' : '답변 완료'}
        </Text>
        <Text style={[styles.threadTime, { color: palette.sub }]}>{last.time}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  eventDate: { width: 40, alignItems: 'center' },
  eventDay: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 28 },
  eventMonth: { fontSize: 13, fontWeight: '600' },
  eventBody: { flex: 1, gap: 6 },
  eventTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  eventTarget: { fontSize: 14, fontWeight: '500' },
  dday: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  threadRow: { borderWidth: 1.5, borderRadius: 22, padding: 16, marginBottom: 12, gap: 8 },
  threadTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  threadTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  threadSub: { fontSize: 14, fontWeight: '500' },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
  threadPreview: { fontSize: 16, lineHeight: 23 },
  threadBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  threadStatus: { fontSize: 14, fontWeight: '700' },
  threadTime: { fontSize: 14 },
});
