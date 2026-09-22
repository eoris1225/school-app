/*
 * 웹에서는 멀쩡한데 빌드한 앱에서만 안 되는 것들을 세요.
 *
 *   deno run --allow-read scripts/check-native-only.ts
 *
 * 이 계열이 제일 무서워요. 브라우저 검사가 전부 통과하고, 개발 중에도
 * 멀쩡하고, 폰에 깔아서 손으로 만져봐야만 알거든요. 우리가 이미 한 번
 * 당했어요 — 커스텀 컬러 색상환이 APK 에서만 안 돌아갔어요.
 *
 * 그래서 눈으로 못 보는 자리를 여기서 세요. 넷을 봐요.
 *
 *   1) 손가락을 알아듣는 판이 깔려 있나
 *   2) 글씨가 우리 글꼴로 나오나
 *   3) 브라우저에만 있는 걸 폰에서도 부르나
 *   4) 자판이 입력칸을 덮나
 *
 * 세는 것이라 완벽하진 않아요. 여기 통과했다고 폰에서 다 된다는 뜻은
 * 아니에요. 다만 '한 번 당한 자리' 는 두 번 안 당해요.
 */

const SKIP = ['node_modules', '.git', 'dist', '.expo'];

const fails: string[] = [];
const ok = (c: boolean, m: string) => {
  console.log(`${c ? '  통과' : '  실패'}  ${m}`);
  if (!c) fails.push(m);
};

const files: string[] = [];
async function walk(dir: string) {
  for await (const e of Deno.readDir(dir)) {
    if (SKIP.some((s) => e.name === s)) continue;
    const at = `${dir}/${e.name}`;
    if (e.isDirectory) await walk(at);
    else if (/\.tsx?$/.test(e.name)) files.push(at);
  }
}
await walk('src');

const text = new Map<string, string>();
for (const f of files) text.set(f, await Deno.readTextFile(f));
const has = (f: string, s: string) => (text.get(f) ?? '').includes(s);

/*
 * 1. 손가락을 알아듣는 판
 *
 * GestureDetector 는 GestureHandlerRootView 안에 있어야만 먹어요. 없으면
 * 빌드한 앱에서 아무 말 없이 안 먹어요(개발 중에만 터져요). 웹은 이게
 * 없어도 돌아가서 브라우저 검사로는 절대 안 잡혀요.
 *
 * 판은 두 장이에요. 앱 맨 바깥에 한 장, 그리고 팝업마다 한 장씩이요.
 * 팝업이 따로 필요한 이유는 Modal 이 안드로이드에서 딴 창으로 떠서,
 * 리액트 트리로는 앱 안이어도 손가락이 바깥 판을 안 거치기 때문이에요.
 */
console.log('\n=== 1. 손가락을 알아듣는 판 ===');
{
  const ROOT = '<GestureHandlerRootView';
  ok(has('src/app/_layout.tsx', ROOT), '앱 맨 바깥에 깔려 있음 (src/app/_layout.tsx)');

  const modals = files.filter((f) => has(f, '<Modal'));
  ok(modals.length > 0, 'Modal 을 그리는 곳을 찾음');
  for (const f of modals) ok(has(f, ROOT), `${f} 가 팝업 안에도 깖`);

  const uses = files.filter((f) => has(f, '<GestureDetector'));
  ok(uses.length > 0, 'GestureDetector 를 쓰는 곳을 찾음');
  for (const f of uses) console.log(`  참고  ${f}`);
}

/*
 * 2. 글씨
 *
 * react-native 의 Text 를 그대로 쓰면 폰에서 글꼴이 달라져요. 굵기 파일이
 * 따로라서, fontWeight 를 보고 알맞은 파일을 골라주는 우리 Text 를 거쳐야
 * 해요. 웹은 한 글꼴에 굵기를 얹을 수 있어서 그냥 잘 나와요.
 */
console.log('\n=== 2. 글씨 ===');
{
  const raw = files.filter(
    (f) => f !== 'src/components/text.tsx' && /from 'react-native'/.test(text.get(f) ?? '') &&
      /import\s*\{[^}]*\bText\b[^}]*\}\s*from 'react-native'/.test(text.get(f) ?? ''),
  );
  ok(raw.length === 0, `react-native 의 Text 를 그대로 쓴 데가 없음${raw.length ? ` (${raw.join(', ')})` : ''}`);
}

/*
 * 3. 브라우저에만 있는 것
 *
 * navigator.serviceWorker, atob, Notification 같은 건 폰에 없어요. 부르면
 * 그 자리에서 터져요. 쓰려면 Platform.OS 로 웹인지 먼저 봐야 해요.
 *
 * window 와 navigator 자체는 폰에도 있어요(속이 비어 있을 뿐이에요).
 * 그래서 '있나 없나' 로 막으면 안 되고 Platform 을 봐야 해요.
 */
console.log('\n=== 3. 브라우저에만 있는 것 ===');
{
  const ONLY_WEB = [
    'navigator.serviceWorker', 'PushManager', 'Notification.', 'matchMedia',
    'atob(', 'btoa(', 'document.', 'localStorage.', 'sessionStorage.',
    'window.location', 'IntersectionObserver', 'ResizeObserver',
  ];
  let bad = 0;
  for (const f of files) {
    const body = text.get(f) ?? '';
    const found = ONLY_WEB.filter((w) => body.includes(w));
    if (found.length === 0) continue;
    // Platform.OS 로 갈라놓은 파일만 써도 돼요.
    const guarded = body.includes('Platform.OS');
    ok(guarded, `${f} 가 Platform.OS 로 웹인지 보고 씀 (${found.join(', ')})`);
    if (!guarded) bad++;
  }
  if (bad === 0) console.log('  통과  막지 않고 쓴 데가 없음');
}

/*
 * 4. 자판
 *
 * 옛날 안드로이드는 자판이 올라오면 창을 알아서 줄여줬어요. 지금은 앱이
 * 화면 끝까지 그리는 방식(edge-to-edge)이라 창이 안 줄어요. 아래쪽에 붙는
 * 입력칸은 자판에 덮여요. 웹에는 이런 게 아예 없어서 못 느껴요.
 *
 * 입력칸이 화면 아래에 붙는 데가 둘이에요. 팝업(로그인)과 쪽지 쓰기요.
 */
console.log('\n=== 4. 자판 ===');
for (const f of ['src/components/sheet.tsx', 'src/app/thread.tsx']) {
  const body = text.get(f) ?? '';
  ok(body.includes('<KeyboardAvoidingView'), `${f} 가 자판을 피함`);
  // behavior 를 안 주면 안드로이드에서 아무것도 안 해요. 그게 원래 버그였어요.
  ok(/behavior="padding"|behavior={'padding'}/.test(body), `${f} 가 behavior="padding" 으로 피함`);
}

console.log(fails.length === 0 ? '\n다 통과했어요\n' : `\n${fails.length}개 실패\n`);
if (fails.length) Deno.exit(1);
