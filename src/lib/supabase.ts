import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

/**
 * 로그인에 쓰는 Supabase 연결이에요.
 *
 * 여기 적힌 두 값은 **비밀이 아니에요.** 원래 앱에 넣으라고 만든 값이에요.
 * 이 키로는 로그인·회원가입만 할 수 있고, 표를 마음대로 읽거나 고칠 수는
 * 없어요. 표에는 RLS를 걸어뒀고, 진짜 권한이 필요한 일은 전부 Edge Function이
 * 대신 해요. 숨겨야 하는 건 NEIS 키와 service_role 키인데, 둘 다 서버 안에만
 * 있어요.
 */
const URL = 'https://isxbdvgvzdqpugaxqrzs.supabase.co';

/** Settings > API Keys 에서 'anon' 또는 'publishable' 키예요. */
const ANON_KEY = '여기에_익명_키';

export const supabase = createClient(URL, ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    // 앱을 껐다 켜도 로그인이 유지돼요.
    persistSession: true,
    autoRefreshToken: true,
    // 우리는 구글 로그인 같은 걸 안 써서 주소로 돌아올 일이 없어요.
    detectSessionInUrl: false,
  },
});

/** 키를 아직 안 넣었으면 알려줘요. 안 넣고 쓰면 왜 안 되는지 알기 어려워요. */
export const keyMissing = ANON_KEY.startsWith('여기에');

// 웹에서는 URL polyfill이 필요 없어요. 불러도 문제는 없고요.
void Platform;
