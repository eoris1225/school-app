import { useWindowDimensions } from 'react-native';

/**
 * 화면 크기를 한곳에서 판단해요. 폰 세로, 폰 가로, 태블릿을 모두 다르게 다뤄요.
 *
 * - tablet   : 짧은 쪽이 600 이상이면 태블릿으로 봐요. (폰을 눕힌 것과 구분돼요)
 * - twoColumn: 홈 본문을 두 칸으로 나눌 만큼 넓은 화면
 * - short    : 눕힌 폰처럼 위아래가 아주 짧은 화면. 홈도 스크롤을 허용해요.
 * - compact  : 작은 폰. 글씨와 여백을 한 단계 줄여요.
 */
export type Layout = {
  width: number;
  height: number;
  tablet: boolean;
  twoColumn: boolean;
  short: boolean;
  compact: boolean;
  /** 글이 너무 넓게 퍼지지 않게 잡아 두는 가운데 기둥 너비 */
  content: number;
  /** 홈 화면 기둥 너비. 두 칸으로 나눌 때는 더 넓게 써요. */
  home: number;
  /** 홈 아이콘 한 개 크기. 네 개가 한 줄에 들어가도록 화면에 맞춰 줄어요. */
  tile: number;
};

/** 화면 좌우 여백과 홈 아이콘 사이 간격. 아래 계산에 쓰여요. */
const GUTTER = 20;
const TILE_GAP = 12;

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  // 가로가 넓으면 세로가 짧아도 태블릿으로 봐요.
  // (패드를 눕히고 브라우저로 열면 주소창 때문에 세로가 600 아래로 내려가요)
  const twoColumn = width >= 900;
  const tablet = twoColumn || Math.min(width, height) >= 600;
  const short = height < 620;
  // 한 줄짜리 목록이 너무 길게 퍼지면 읽기 힘들어서 720에서 끊어요.
  const content = tablet ? 720 : 560;
  /*
   * 홈 아이콘 크기를 화면에서 거꾸로 구해요.
   *
   * 예전에는 80으로 박아뒀어요. 네 개에 간격까지 368이라 화면이 408보다
   * 좁으면 마지막 칸이 잘렸어요. 360짜리 폰에서 '쪽지'가 28만큼 밖으로
   * 나가 있었어요. 이렇게 구하면 좁은 화면에서는 같이 줄어들어요.
   */
  const column = Math.min(width, twoColumn ? Math.min(width - 40, 1040) : content);
  const slot = (column - GUTTER * 2 - TILE_GAP * 3) / 4;
  // 아무리 좁아도 44는 있어야 손가락으로 누를 수 있어요.
  const tile = Math.max(44, Math.min(66, Math.floor(slot)));
  return {
    width,
    height,
    tablet,
    twoColumn,
    short,
    compact: short || (!tablet && height < 760),
    content,
    home: twoColumn ? Math.min(width - 40, 1040) : content,
    tile,
  };
}
