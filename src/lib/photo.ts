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
 * 앨범에서 한 장 고르고 줄여서 돌려줘요.
 * 안 고르고 닫으면 null이에요. 문제가 생기면 우리말 문구를 던져요.
 */
export async function pickPhoto(): Promise<Photo | null> {
  const allowed = await Picker.requestMediaLibraryPermissionsAsync();
  if (!allowed.granted) throw new Error('사진을 쓰려면 앨범 접근을 허용해주세요');

  const picked = await Picker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    // 여기서 줄이지 않아요. 아래에서 긴 변 기준으로 제대로 줄여요.
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;

  const one = picked.assets[0];
  return await shrink(one.uri, one.width, one.height);
}

/** 긴 변을 기준으로 줄이고 JPG로 다시 담아요. */
async function shrink(uri: string, width: number, height: number): Promise<Photo> {
  const long = Math.max(width, height);
  const context = ImageManipulator.manipulate(uri);

  if (long > LONG_EDGE) {
    // 한쪽만 정해주면 나머지는 비율대로 알아서 맞춰줘요.
    if (width >= height) context.resize({ width: LONG_EDGE, height: null });
    else context.resize({ width: null, height: LONG_EDGE });
  }

  const rendered = await context.renderAsync();
  const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

  const bytes = await sizeOf(out.uri);
  if (bytes > MAX_BYTES) throw new Error('사진이 너무 커요. 다른 사진을 골라주세요');

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
