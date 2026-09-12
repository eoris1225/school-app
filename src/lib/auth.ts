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

/*
 * 가입 결과예요. 세 갈래로 나뉘어요.
 *
 *   done     바로 로그인됐어요. Supabase에서 메일 확인이 꺼져 있는 경우예요.
 *   mail     메일함에서 확인 링크를 눌러야 해요. 메일 확인이 켜져 있어요.
 *   problem  안 됐어요. 화면에 보여줄 문구가 담겨 있어요.
 *
 * 왜 나눠야 하냐면, 예전에는 오류가 없으면 다 성공으로 봤어요. 그런데
 * 메일 확인이 켜져 있으면 Supabase가 오류 없이 "계정은 만들었는데 아직
 * 로그인은 아니다"를 줘요. 그걸 성공으로 보면 앱이 홈으로 넘어가려다
 * 토큰이 없어서 멈춰 있어요. 버튼이 죽은 것처럼 보여요.
 */
export type SignUp =
  | { kind: 'done' }
  | { kind: 'mail'; email: string }
  | { kind: 'problem'; message: string };

export async function signUp(email: string, password: string, name: string): Promise<SignUp> {
  const mail = email.trim();
  const { data, error } = await supabase.auth.signUp({
    email: mail,
    password,
    options: { data: { name: name.trim() } },
  });
  if (error) return { kind: 'problem', message: say(error.message) };
  /*
   * 세션이 왔으면 바로 로그인된 거예요. 안 왔으면 메일을 기다려야 해요.
   *
   * 이미 가입된 메일로 또 가입하면 Supabase는 오류를 안 줘요. 남의 메일이
   * 가입돼 있는지 알아내는 걸 막으려고 일부러 그래요. 그때도 세션이 없으니
   * "메일함을 봐주세요"로 보내요. 실제로 가입된 사람에게는 맞는 안내예요.
   */
  return data.session ? { kind: 'done' } : { kind: 'mail', email: mail };
}

/**
 * 확인 메일을 다시 보내요.
 *
 * 메일이 안 오거나 스팸함으로 갔을 때 쓸 길이 있어야 해요. 없으면 가입하고
 * 나서 아무것도 못 하는 막다른 길이 돼요.
 */
export async function resendConfirm(email: string): Promise<string | null> {
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
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
