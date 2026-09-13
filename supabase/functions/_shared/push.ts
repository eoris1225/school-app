/**
 * 알림을 보내요.
 *
 * 웹 푸시를 써요. 앱을 웹으로 나눠주고 있어서 이 길밖에 없어요.
 * expo-notifications 는 웹을 아예 지원 안 하고(android, ios 뿐이에요),
 * 안드로이드 푸시는 Expo Go 에서 빠졌고, EAS 프로젝트도 아직 없거든요.
 *
 * 아이폰은 "홈 화면에 추가" 를 한 경우에만 알림이 와요 (iOS 16.4 이상).
 * 사파리 탭으로 열어둔 것은 안 와요. 그래서 지난번에 홈 화면 추가를
 * 제대로 만들어둔 게 여기서 쓰여요.
 *
 * 열쇠는 secrets 로 넣어요. 코드에 적으면 GitHub에 올라가요.
 *   npx web-push generate-vapid-keys
 *   npx supabase secrets set VAPID_PUBLIC=... VAPID_PRIVATE=... VAPID_SUBJECT=mailto:...
 */
import webpush from 'npm:web-push@3.6.7';

const PUBLIC = Deno.env.get('VAPID_PUBLIC') ?? '';
const PRIVATE = Deno.env.get('VAPID_PRIVATE') ?? '';
// 푸시 서버가 문제가 생겼을 때 연락할 곳이에요. 규격이 요구해요.
const SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@example.com';

const URL_BASE = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

/** 열쇠가 없으면 알림 기능 자체를 꺼둬요. 앱이 미리 물어봐요. */
export const pushReady = () => Boolean(PUBLIC && PRIVATE);

/** 앱에 건네줄 공개 열쇠. 이건 공개해도 되는 값이에요. */
export const pushPublicKey = () => PUBLIC;

if (pushReady()) webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);

export class PushError extends Error {}

const rest = (path: string) => `${URL_BASE}/rest/v1/${path}`;
const headers = () => ({
  apikey: SERVICE_KEY!,
  authorization: `Bearer ${SERVICE_KEY}`,
  'content-type': 'application/json',
});

export type Sub = { endpoint: string; p256dh: string; auth: string; agent?: string };

/**
 * 받을 곳을 담아요.
 *
 * 같은 주소가 다시 오면 덮어써요. 새 줄을 만들면 알림이 두 번 와요.
 * 기기를 바꿔 로그인하면 주소 주인도 바뀌어야 해요.
 */
export async function saveSub(userId: string, sub: Sub): Promise<void> {
  const res = await fetch(`${rest('push_subs')}?on_conflict=endpoint`, {
    method: 'POST',
    headers: { ...headers(), prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      agent: sub.agent ?? null,
    }),
  });
  if (!res.ok) throw new PushError(`알림 설정을 담지 못했어요 (${res.status})`);
}

/** 그만 받기. 주인이 맞을 때만 지워요. */
export async function removeSub(userId: string, endpoint: string): Promise<void> {
  const q = new URLSearchParams({ endpoint: `eq.${endpoint}`, user_id: `eq.${userId}` });
  const res = await fetch(`${rest('push_subs')}?${q}`, { method: 'DELETE', headers: headers() });
  if (!res.ok) throw new PushError(`알림 설정을 지우지 못했어요 (${res.status})`);
}

/** 이 사람이 알림을 켜둔 곳이 몇 군데인지 */
export async function countSubs(userId: string): Promise<number> {
  const q = new URLSearchParams({ select: 'id', user_id: `eq.${userId}` });
  const res = await fetch(`${rest('push_subs')}?${q}`, { headers: headers() });
  if (!res.ok) return 0;
  return ((await res.json()) as unknown[]).length;
}

export type Note = {
  title: string;
  body: string;
  /** 알림을 눌렀을 때 열 화면. '/community' 처럼요. */
  path?: string;
  /**
   * 같은 딱지를 단 알림은 마지막 것만 남아요.
   * 한 쪽지에 답이 세 번 달려도 알림이 세 개 쌓이면 성가셔요.
   */
  tag?: string;
};

/**
 * 이 사람의 모든 기기로 보내요.
 *
 * 실패해도 부르는 쪽을 멈추지 않아요. 알림이 안 갔다고 쪽지 답장까지
 * 실패하면 안 되잖아요. 알림은 덤이에요.
 *
 * 404와 410은 "그 주소는 이제 없어요" 라는 뜻이에요. 앱을 지웠거나 알림을
 * 껐거나요. 그때는 줄을 지워요. 안 지우면 볼 때마다 같은 실패를 반복해요.
 */
export async function notify(userId: string, note: Note): Promise<number> {
  if (!pushReady()) return 0;

  const q = new URLSearchParams({ select: 'endpoint,p256dh,auth', user_id: `eq.${userId}` });
  const res = await fetch(`${rest('push_subs')}?${q}`, { headers: headers() });
  if (!res.ok) return 0;
  const rows = (await res.json()) as { endpoint: string; p256dh: string; auth: string }[];

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify(note),
          { TTL: 60 * 60 * 12 },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(row.endpoint);
        else console.error('알림 실패', status, String(e).slice(0, 120));
      }
    }),
  );

  if (dead.length) {
    const gone = new URLSearchParams({ endpoint: `in.(${dead.map((d) => `"${d}"`).join(',')})` });
    await fetch(`${rest('push_subs')}?${gone}`, { method: 'DELETE', headers: headers() }).catch(() => {});
  }
  return sent;
}
