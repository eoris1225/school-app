import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { subjectGroup, type SubjectGroup } from '@/lib/subject';

/*
 * 3D 이모지 그림이에요.
 *
 * 예전에는 아이콘 자리에 선으로 그린 기호(SF Symbols)를 넣고, 대신 담는
 * 상자에 그라데이션과 광택을 잔뜩 발라서 입체인 척했어요. 그러면 버튼만
 * 번들거리고 정작 내용물은 납작해요. 잘 만든 앱들은 반대로 해요.
 * 상자는 연한 색으로 얌전히 두고, 그 안에 진짜 입체로 그린 물체를 놓아요.
 *
 * 그림은 Microsoft Fluent Emoji (MIT)를 받아서 144px로 줄이고 색 수를
 * 줄여뒀어요. 23개 합쳐서 216KB예요. 출처는 assets/emoji/LICENSE.md 에 적어뒀어요.
 */

// require는 번들러가 파일을 찾아야 해서 변수로 쓸 수 없어요. 전부 적어둬요.
const ART = {
  meal: require('@/../assets/emoji/meal.png'),
  timetable: require('@/../assets/emoji/timetable.png'),
  calendar: require('@/../assets/emoji/calendar.png'),
  chat: require('@/../assets/emoji/chat.png'),
  inbox: require('@/../assets/emoji/inbox.png'),
  memo: require('@/../assets/emoji/memo.png'),
  home: require('@/../assets/emoji/home.png'),
  book: require('@/../assets/emoji/book.png'),
  number: require('@/../assets/emoji/number.png'),
  globe: require('@/../assets/emoji/globe.png'),
  flask: require('@/../assets/emoji/flask.png'),
  map: require('@/../assets/emoji/map.png'),
  clock: require('@/../assets/emoji/clock.png'),
  laptop: require('@/../assets/emoji/laptop.png'),
  run: require('@/../assets/emoji/run.png'),
  music: require('@/../assets/emoji/music.png'),
  brush: require('@/../assets/emoji/brush.png'),
  bulb: require('@/../assets/emoji/bulb.png'),
  star: require('@/../assets/emoji/star.png'),
  party: require('@/../assets/emoji/party.png'),
  pin: require('@/../assets/emoji/pin.png'),
  warn: require('@/../assets/emoji/warn.png'),
  bell: require('@/../assets/emoji/bell.png'),
} as const;

export type EmojiName = keyof typeof ART;

/**
 * 교과군마다 어울리는 그림이에요.
 * NEIS는 "미적분Ⅰ" 같은 선택과목 이름을 주기 때문에 이름이 아니라
 * 교과군으로 골라요. 어떤 이름이 어느 교과군인지는 `src/lib/subject.ts` 가 정해요.
 */
const GROUP_ART: Record<SubjectGroup, EmojiName> = {
  국어: 'book',
  수학: 'number',
  영어: 'globe',
  외국어: 'globe',
  과학: 'flask',
  사회: 'map',
  역사: 'clock',
  정보: 'laptop',
  체육: 'run',
  음악: 'music',
  미술: 'brush',
  교양: 'bulb',
  창체: 'star',
  휴일: 'party',
  기타: 'pin',
};

export const subjectArt = (name: string): EmojiName => GROUP_ART[subjectGroup(name)];

/**
 * 그림이 반 픽셀 밀리지 않게 크기를 골라줘요.
 *
 * 담는 상자가 42이고 그림이 21이면 양옆 여백이 10.5가 돼요. 화면은 반
 * 픽셀을 그릴 수 없어서 한쪽으로 밀려요. 눈에 확 띄진 않는데 묘하게
 * 안 맞아 보여요. 상자와 그림의 차이를 짝수로 맞추면 딱 떨어져요.
 */
export function fitArt(box: number, ratio: number): number {
  const raw = Math.round(box * ratio);
  return (Math.round(box) - raw) % 2 === 0 ? raw : raw + 1;
}

export function Emoji({ name, size = 28 }: { name: EmojiName; size?: number }) {
  return (
    <Image
      source={ART[name]}
      style={{ width: size, height: size }}
      contentFit="contain"
      // 그림 하나뿐이라 넘길 게 없어요. 바로 보여줘요.
      transition={0}
      accessible={false}
    />
  );
}

/**
 * 연한 색 바탕에 3D 그림을 올린 정사각형이에요.
 * 바탕에는 그라데이션도 광택도 없어요. 튀어나와 보여야 하는 건 그림이에요.
 */
export function EmojiPad({
  name,
  size = 56,
  bg,
  ratio = 0.62,
}: {
  name: EmojiName;
  size?: number;
  bg: string;
  /** 상자 대비 그림 크기. 기본 0.62예요. */
  ratio?: number;
}) {
  return (
    <View
      style={[
        styles.pad,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg },
      ]}>
      <Emoji name={name} size={fitArt(size, ratio)} />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { alignItems: 'center', justifyContent: 'center' },
});
