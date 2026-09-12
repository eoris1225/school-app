import { StyleSheet, View } from 'react-native';

import { Emoji, fitArt, type EmojiName } from '@/components/emoji';
import { Bump, Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { SOLID, tone, type ToneKey } from '@/constants/tones';
import { useApp } from '@/lib/app-state';

/*
 * 홈에서 누르는 큰 아이콘이에요.
 *
 * 예전에는 상자에 그라데이션과 광택, 색 그림자를 잔뜩 발라서 입체인 척하고
 * 그 안에는 납작한 흰 기호를 넣었어요. 버튼만 번들거리고 내용물은 평면이라
 * 어딘가 어설퍼 보였어요.
 *
 * 지금은 반대예요. 바탕은 연한 색 한 겹으로 얌전히 두고, 그 위에 진짜
 * 입체로 그린 물체를 올려요. 튀어나와 보여야 하는 건 상자가 아니라 물체예요.
 *
 * 색은 아껴 써요. 네 칸이 전부 알록달록하면 어디를 봐야 할지 모르겠어요.
 * 평소에는 단색으로 조용히 있다가, 알릴 게 생긴 칸만 색이 들어와요.
 *   쪽지  안 읽은 게 있을 때
 *   달력  수행평가가 일주일 안에 있을 때
 * 그래서 색이 보이면 "저기 뭔가 있다"는 뜻이 돼요.
 */
export function Tile({
  art,
  tone: toneKey,
  label,
  onPress,
  badge,
  tag,
  size = 66,
}: {
  art: EmojiName;
  tone: ToneKey;
  label: string;
  onPress: () => void;
  /** 오른쪽 위 빨간 숫자 */
  badge?: number;
  /** 위쪽에 걸치는 글자 딱지. 'PICK' 처럼 짧게요. */
  tag?: string;
  size?: number;
}) {
  const { palette, scheme } = useApp();
  // 배지나 딱지가 붙었다는 건 알릴 게 있다는 뜻이에요. 그때만 색을 켜요.
  const loud = !!badge || !!tag;
  // 조용한 칸은 테마색을 아주 옅게 깔아요. 회색으로 두면 꺼진 버튼처럼 보여요.
  const pad = loud ? tone(toneKey, scheme).bg : palette.tint;

  const read = [label, tag, badge ? `새 소식 ${badge}개` : null].filter(Boolean).join(', ');

  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={read}
      depth={0.09}
      style={styles.wrap}>
      <View>
        <View style={[styles.pad, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: pad }]}>
          <Emoji name={art} size={fitArt(size, 0.64)} tone={loud ? 'color' : 'mono'} />
        </View>

        {/* 딱지는 상자 위쪽에 반쯤 걸쳐요. 안에 넣으면 그림을 가려요. */}
        {tag ? (
          <View style={[styles.tag, { backgroundColor: SOLID[toneKey], borderColor: palette.bg }]}>
            <Text style={styles.tagText} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        ) : null}

        {badge ? (
          <Bump value={badge} style={styles.badgeWrap}>
            <View style={[styles.badge, { borderColor: palette.bg }]}>
              <Text numeric style={styles.badgeText}>
                {badge}
              </Text>
            </View>
          </Bump>
        ) : null}
      </View>

      <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 80, alignItems: 'center', gap: 8 },
  pad: { alignItems: 'center', justifyContent: 'center' },

  tag: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  badgeWrap: { position: 'absolute', top: -6, right: -6 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    paddingHorizontal: 5,
    backgroundColor: '#E5484D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  label: { fontSize: 13, fontWeight: '600' },
});
