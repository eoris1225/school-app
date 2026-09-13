import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Picker from 'expo-image-picker';

/**
 * 쪽지에 붙일 사진을 고르고 줄여요.
 *
 * 요즘 폰 사진은 한 장에 3~6MB예요. 그대로 올리면 학생 데이터도 쓰고
 * 서버값도 나가요. 문제집 한 쪽을 읽는 데 그만한 크기가 필요하지도 않고요.
 * 긴 변을 1600까지 줄이고 JPG로 다시 담으면 보통 300KB 안쪽이 돼요.
 * 글씨는 그대로 읽혀요.
 */

/** 긴 변을 이 길이까지 줄여요. 문제집 글씨가 읽히는 선이에요. */
const LONG_EDGE = 1600;
/** 서버가 받아주는 한계. 여기서 먼저 걸러서 헛걸음을 막아요. */
const MAX_BYTES = 3 * 1024 * 1024;

export type Photo = { uri: string; width: number; height: number; bytes: number };

/**
 * 화면에 그대로 띄워도 되는 오류예요.
 *
 * 이걸 나눠둔 이유가 있어요. 예전에는 무슨 오류든 message 를 그대로 띄웠는데,
 * 사진 줄이는 라이브러리가 터지면 이런 게 학생 화면에 떴어요.
 *
 *   Failed to execute 'createImageData' on 'CanvasRenderingContext2D':
 *   The source height is zero or not a number.
 *
 * 한글 앱에 영어 개발자 메시지가 뜨면 뭘 하라는 건지 알 수가 없어요.
 * 우리가 적은 문구만 띄우고, 나머지는 우리말로 덮되 원래 내용은 기록에
 * 남겨요. 찾을 때는 그게 있어야 하니까요.
 */
export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoError';
  }
}

/**
 * 앨범에서 한 장 고르고 줄여서 돌려줘요.
 * 안 고르고 닫으면 null이에요. 문제가 생기면 우리말 문구를 던져요.
 */
export async function pickPhoto(): Promise<Photo | null> {
  const allowed = await Picker.requestMediaLibraryPermissionsAsync();
  if (!allowed.granted) throw new PhotoError('사진을 쓰려면 앨범 접근을 허용해주세요');

  const picked = await Picker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    // 여기서 줄이지 않아요. 아래에서 긴 변 기준으로 제대로 줄여요.
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;

  const one = picked.assets[0];
  try {
    return await shrink(one.uri, one.width, one.height);
  } catch (e) {
    if (e instanceof PhotoError) throw e;
    // 라이브러리가 터진 거예요. 사람에게는 우리말로, 기록에는 원래대로.
    console.warn('사진을 줄이지 못했어요', e);
    throw new PhotoError('사진을 줄이지 못했어요. 다른 사진을 골라주세요');
  }
}

/** 긴 변을 기준으로 줄이고 JPG로 다시 담아요. */
async function shrink(uri: string, width: number, height: number): Promise<Photo> {
  const long = Math.max(width, height);
  const context = ImageManipulator.manipulate(uri);

  if (long > LONG_EDGE) {
    /*
     * 한쪽만 정해주면 나머지는 비율대로 알아서 맞춰줘요.
     *
     * **안 정하는 쪽은 아예 안 적어요. null 을 적으면 안 돼요.**
     *
     * 타입은 `{ width?: number | null }` 이라 null 이 받아들여지고, 문서에도
     * null 로 적혀 있어요. 그런데 웹 구현은 `!== undefined` 로만 걸러요.
     * null 은 undefined 가 아니니까 통과해서 그대로 목표 크기가 돼요.
     * 그러면 캔버스 높이가 0이 되고 이 오류가 나요.
     *
     *   Failed to execute 'createImageData' on 'CanvasRenderingContext2D':
     *   The source height is zero or not a number.
     *
     * (expo-image-manipulator 의 web/actions/ResizeAction.web.ts 예요)
     * 폰에서는 null 로도 됐어요. 그래서 웹에서 사진 보낼 때만 터졌어요.
     */
    if (width >= height) context.resize({ width: LONG_EDGE });
    else context.resize({ height: LONG_EDGE });
  }

  const rendered = await context.renderAsync();
  const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

  const bytes = await sizeOf(out.uri);
  if (bytes > MAX_BYTES) throw new PhotoError('사진이 너무 커요. 다른 사진을 골라주세요');

  return { uri: out.uri, width: out.width, height: out.height, bytes };
}

/** 파일이 몇 바이트인지. 못 재면 0으로 봐요(서버가 한 번 더 걸러요). */
async function sizeOf(uri: string): Promise<number> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return blob.size;
  } catch {
    return 0;
  }
}

/** 사람이 읽는 크기. "320KB" 처럼요. */
export function prettySize(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
