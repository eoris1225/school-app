import { StyleSheet, View } from 'react-native';

import { Emoji, subjectArt, type EmojiName } from '@/components/emoji';
import { Icon } from '@/components/icon';
import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Tag } from '@/components/ui';
import { classLabel, SUBJECT_TEACHERS, targetLabel, type SchoolEvent, type Thread } from '@/data/mock';
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

  return (
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
        {last.from !== role && role === 'student' ? `답변: ${last.text}` : last.text}
      </Text>
      <View style={styles.threadBottom}>
        <Text style={[styles.threadStatus, { color: pending ? palette.sub : palette.accentDeep }]}>
          {pending ? '답변 대기' : '답변 완료'}
        </Text>
        <Text style={[styles.threadTime, { color: palette.sub }]}>{last.time}</Text>
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
