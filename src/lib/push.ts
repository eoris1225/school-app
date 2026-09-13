import { Platform } from 'react-native';

import { getPushInfo, subscribePush, unsubscribePush } from '@/lib/api';

/*
 * 알림을 켜고 꺼요.
 *
 * 웹 푸시를 써요. 지금 앱을 웹으로 나눠주고 있어서 이 길밖에 없어요.
 * expo-notifications 는 웹을 아예 지원하지 않고(android, ios 뿐이에요),
 * 안드로이드 푸시는 Expo Go 에서 빠졌고, EAS 프로젝트도 아직 없거든요.
 * 나중에 앱으로 내면 그때 네이티브 알림을 얹으면 돼요.
 *
 * 아이폰은 조건이 하나 더 있어요. "홈 화면에 추가" 를 해야 알림이 와요
 * (iOS 16.4 이상). 사파리 탭으로 열어둔 것만으로는 안 와요. 그래서 안 되는
 * 이유를 화면에 적어줘야 해요. 그냥 "안 돼요" 라고만 하면 고칠 수가 없어요.
 */

export type PushState =
  /** 이 브라우저가 알림을 아예 못 해요 */
  | { kind: 'unsupported'; why: string }
  /** 서버에 열쇠가 아직 없어요 */
  | { kind: 'notready' }
  /** 켤 수 있어요 */
  | { kind: 'off' }
  /** 받는 중이에요. count 는 몇 군데서 받는지 */
  | { kind: 'on'; count: number }
  /** 브라우저 설정에서 막아뒀어요. 앱에서는 못 풀어요 */
  | { kind: 'blocked' };

/** 홈 화면에 추가해서 연 것인지 */
function installed(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = (window.navigator as { standalone?: boolean }).standalone;
  return standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

function isApple(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as { maxTouchPoints?: number }).maxTouchPoints! > 1);
}

/** 왜 못 하는지. 할 수 있으면 null이에요. */
function blocker(): string | null {
  if (Platform.OS !== 'web') {
    return '지금은 웹에서만 알림을 받을 수 있어요';
  }
  if (typeof window === 'undefined') return '알림을 켤 수 없는 화면이에요';
  if (!('serviceWorker' in navigator)) return '이 브라우저는 알림을 지원하지 않아요';
  if (!('PushManager' in window)) {
    return isApple() && !installed()
      ? '아이폰은 홈 화면에 추가한 뒤에 알림을 켤 수 있어요'
      : '이 브라우저는 알림을 지원하지 않아요';
  }
  if (isApple() && !installed()) {
    return '아이폰은 홈 화면에 추가한 뒤에 알림을 켤 수 있어요';
  }
  return null;
}

/**
 * 앱이 놓인 자리예요. 늘 '/' 로 끝나게 맞춰요.
 *
 * EXPO_BASE_URL 은 '/school-app' 처럼 끝 슬래시 없이 와요. 그대로 이어 붙이면
 * '/school-appsw.js' 가 돼요. 실제로 그래서 404가 났어요. 자리(scope)도
 * 슬래시로 끝나야 해요. 안 그러면 앱 화면들이 그 일꾼 밑에 안 들어와요.
 */
function basePath(): string {
  const raw = process.env.EXPO_BASE_URL ?? '/';
  const path = new URL(raw, window.location.origin).pathname;
  return path.endsWith('/') ? path : `${path}/`;
}

/** 일꾼(서비스 워커)을 깨워요. 이미 있으면 그걸 써요. */
async function worker(): Promise<ServiceWorkerRegistration> {
  const base = basePath();
  const already = await navigator.serviceWorker.getRegistration(base);
  if (already) return already;
  return await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
}

/**
 * base64url 로 온 공개 열쇠를 브라우저가 받는 모양으로 바꿔요.
 *
 * ArrayBuffer 로 돌려줘요. Uint8Array 를 그대로 주면 타입이 안 맞아요.
 * 공유 메모리에 얹힌 것일 수도 있어서 브라우저 규격이 안 받아주거든요.
 */
function toBytes(key: string): ArrayBuffer {
  const pad = '='.repeat((4 - (key.length % 4)) % 4);
  const raw = atob((key + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

/** 구독에 담긴 열쇠를 글자로 꺼내요. */
function keyOf(sub: PushSubscription, name: 'p256dh' | 'auth'): string {
  const raw = sub.getKey(name);
  if (!raw) return '';
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/** 지금 상태를 알아봐요. 화면을 그리기 전에 불러요. */
export async function pushState(): Promise<PushState> {
  const why = blocker();
  if (why) return { kind: 'unsupported', why };
  if (Notification.permission === 'denied') return { kind: 'blocked' };

  const info = await getPushInfo().catch(() => null);
  if (!info?.ready) return { kind: 'notready' };

  // 등록할 때와 같은 자리로 찾아요. 자리를 안 주면 "지금 이 화면을 맡은
  // 일꾼" 을 주는데, 그건 화면이 어디냐에 따라 달라져요.
  const reg = await navigator.serviceWorker.getRegistration(basePath());
  const sub = await reg?.pushManager.getSubscription();
  return sub ? { kind: 'on', count: info.count } : { kind: 'off' };
}

/**
 * 알림을 켜요. 잘 되면 null, 안 되면 화면에 보여줄 문구예요.
 *
 * 반드시 사람이 버튼을 누른 자리에서 불러야 해요. 브라우저가 그렇게 정해뒀어요.
 * 화면을 열자마자 물어보면 아예 거절당하고, 그러면 다시 물어볼 수도 없어요.
 */
export async function enablePush(): Promise<string | null> {
  const why = blocker();
  if (why) return why;

  const info = await getPushInfo().catch(() => null);
  if (!info?.ready) return '알림이 아직 준비되지 않았어요';

  const allowed = await Notification.requestPermission();
  if (allowed === 'denied') return '브라우저 설정에서 알림이 막혀 있어요';
  if (allowed !== 'granted') return '알림을 켜지 않았어요';

  try {
    const reg = await worker();
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        // 이걸 켜야 해요. 안 켜면 "내용 없는 알림" 만 보낼 수 있어요.
        userVisibleOnly: true,
        applicationServerKey: toBytes(info.key),
      }));

    await subscribePush({
      endpoint: sub.endpoint,
      p256dh: keyOf(sub, 'p256dh'),
      auth: keyOf(sub, 'auth'),
      agent: navigator.userAgent.slice(0, 120),
    });
    return null;
  } catch (e) {
    return e instanceof Error && e.message ? `알림을 켜지 못했어요 (${e.message})` : '알림을 켜지 못했어요';
  }
}

/** 이 기기에서 그만 받아요. 다른 기기는 그대로예요. */
export async function disablePush(): Promise<string | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration(basePath());
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return null;
    await unsubscribePush(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
    return null;
  } catch {
    return '알림을 끄지 못했어요';
  }
}
