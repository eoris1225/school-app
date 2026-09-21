/*
 * 손가락 움직임을 알아듣는 판이 깔려 있는지 봐요.
 *
 *   deno run --allow-read scripts/check-gesture-root.ts
 *
 * 왜 이걸 따로 세냐면요.
 *
 * `GestureDetector` 는 `GestureHandlerRootView` 안에 있어야만 손가락을
 * 알아들어요. 없으면 개발 중에는 대놓고 터지는데(그때만 검사해요),
 * 빌드한 앱에서는 아무 말 없이 그냥 안 먹어요. 게다가 웹에서는 이 판이
 * 없어도 잘 돌아가요. 그래서 브라우저 검사는 전부 통과하고, 폰에 깔아서
 * 손으로 만져봐야만 알아요.
 *
 * 실제로 그렇게 당했어요. 커스텀 컬러의 색상환이 웹에서는 돌아가고
 * 빌드한 앱에서만 안 돌아갔어요. 판이 아예 한 장도 없었거든요.
 *
 * 판은 두 장 필요해요.
 *
 *   1) 앱 맨 바깥 (src/app/_layout.tsx)
 *   2) 팝업 안 (Modal 을 그리는 곳)
 *
 * 2번이 따로 필요한 이유는, 안드로이드에서 Modal 이 딴 창으로 뜨기
 * 때문이에요. 리액트 트리로는 앱 안이라 1번이 물려 있는 것처럼 보이지만
 * 화면으로는 바깥이라 손가락이 1번을 안 거쳐요.
 */

const ROOT_VIEW = 'GestureHandlerRootView';
const SKIP = ['node_modules', '.git', 'dist', '.expo'];

const fails: string[] = [];
const ok = (c: boolean, m: string) => {
  console.log(`${c ? '  통과' : '  실패'}  ${m}`);
  if (!c) fails.push(m);
};

/** src 안의 화면 파일을 전부 모아요. */
const files: string[] = [];
async function walk(dir: string) {
  for await (const e of Deno.readDir(dir)) {
    const at = `${dir}/${e.name}`;
    if (SKIP.some((s) => e.name === s)) continue;
    if (e.isDirectory) await walk(at);
    else if (/\.tsx$/.test(e.name)) files.push(at);
  }
}
await walk('src');

const text = new Map<string, string>();
for (const f of files) text.set(f, await Deno.readTextFile(f));

/** 판을 진짜로 그리는지 봐요. import 만 해두고 안 쓰면 소용없어요. */
const lays = (s: string) => s.includes(`<${ROOT_VIEW}`);

console.log('\n=== 앱 맨 바깥 ===');
const layout = text.get('src/app/_layout.tsx') ?? '';
ok(lays(layout), `src/app/_layout.tsx 가 ${ROOT_VIEW} 를 깖`);

console.log('\n=== 팝업 안 ===');
// Modal 을 그리는 곳은 전부 제 판을 따로 깔아야 해요. 지금은 sheet.tsx
// 한 곳인데, 나중에 더 생겨도 여기서 걸려요.
const modals = files.filter((f) => (text.get(f) ?? '').includes('<Modal'));
ok(modals.length > 0, 'Modal 을 그리는 곳을 찾음');
for (const f of modals) ok(lays(text.get(f) ?? ''), `${f} 가 팝업 안에 ${ROOT_VIEW} 를 깖`);

console.log('\n=== 손가락을 쓰는 곳 ===');
const uses = files.filter((f) => (text.get(f) ?? '').includes('<GestureDetector'));
ok(uses.length > 0, 'GestureDetector 를 쓰는 곳을 찾음');
for (const f of uses) console.log(`  참고  ${f}`);

console.log(fails.length === 0 ? '\n다 통과했어요\n' : `\n${fails.length}개 실패\n`);
if (fails.length) Deno.exit(1);
