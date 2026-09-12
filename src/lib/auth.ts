import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * 로그인과 회원가입이에요.
 *
 * Supabase가 보내주는 영어 오류를 그대로 보여주면 학생이 뭘 잘못했는지
 * 알 수 없어요. 여기서 우리말로 바꿔서 내보내요.
 */

export type Role = 'student' | 'teacher';

// 서버가 알려주는 내 정보예요. 모양은 api.ts 한 곳에만 적어둬요.
// 두 군데에 적어두면 서버가 칸을 늘렸을 때 한쪽만 고치게 돼요.
export type { Me } from '@/lib/api';

/** Supabase가 주는 영어 문구를 우리말로 바꿔요. */
function say(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return '이메일이나 비밀번호가 맞지 않아요';
  if (m.includes('user already registered')) return '이미 가입된 이메일이에요. 로그인해주세요';
  if (m.includes('password should be at least')) return '비밀번호는 6자 이상이어야 해요';
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return '이메일 모양이 올바르지 않아요';
  }
  if (m.includes('email not confirmed')) return '메일함에서 확인 링크를 눌러주세요';
  if (m.includes('rate limit') || m.includes('too many')) return '잠시 뒤에 다시 해주세요';
  if (m.includes('failed to fetch') || m.includes('network')) return '인터넷 연결을 확인해주세요';
  return '로그인에 문제가 생겼어요';
}

/** 잘 되면 null, 안 되면 화면에 보여줄 문구를 돌려줘요. */
export async function signUp(email: string, password: string, name: string): Promise<string | null> {
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() } },
  });
  return error ? say(error.message) : null;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? say(error.message) : null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** 지금 로그인 상태. 없으면 null이에요. */
export async function currentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** 로그인 상태가 바뀔 때마다 알려줘요. 그만 들으려면 돌려받은 걸 부르세요. */
export function watchSession(onChange: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => onChange(session));
  return () => data.subscription.unsubscribe();
}

/** 서버에 보낼 때 쓸 토큰. 이게 있어야 서버가 나를 알아봐요. */
export async function accessToken(): Promise<string | null> {
  return (await currentSession())?.access_token ?? null;
}
