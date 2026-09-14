/*
 * 앱 이름이 한 군데라도 빠진 데가 없는지 봐요.
 *
 *   deno run --allow-read scripts/check-name.ts
 *
 * 이름은 한 곳에 못 모아요. app.json, manifest.json, 서비스 워커, 시작
 * 화면이 서로 다른 언어로 쓰여 있어서 한 상수를 같이 쓸 수가 없어요.
 * 그래서 바꿀 때 꼭 한두 군데가 남아요. 실제로 시작 화면이 남아서
 * 앱을 켜면 옛 이름이 떴어요.
 *
 * 모을 수 없으면 세는 수밖에 없어요. 여기서 세요.
 */

const NAME = '나이스쿨';

/** 여기엔 반드시 새 이름이 있어야 해요. */
const MUST = [
  'app.json',
  'public/manifest.json',
  'public/sw.js',
  'scripts/add-pwa-tags.mjs',
  'src/app/start.tsx',
  'README.md',
];

/** 어디에도 남아 있으면 안 되는 옛 이름들 */
const OLD = ['학교생활 도우미', '학교생활', '학교도우미'];

/** 안 뒤지는 곳. 만들어진 것과 찍은 그림이에요. */
const SKIP = ['node_modules', '.git', 'dist', '.expo', 'docs/shots', 'assets'];

const fails: string[] = [];
const ok = (c: boolean, m: string) => {
  console.log(`${c ? '  통과' : '  실패'}  ${m}`);
  if (!c) fails.push(m);
};

console.log('\n=== 새 이름이 들어 있어야 하는 곳 ===');
for (const f of MUST) {
  let has = false;
  try {
    has = (await Deno.readTextFile(f)).includes(NAME);
  } catch {
    // 파일이 없으면 그것도 실패예요. 이름을 적을 데가 사라진 거니까요.
  }
  ok(has, `${f} 에 '${NAME}' 이 있음`);
}

console.log('\n=== 옛 이름이 남아 있는 곳 ===');
const found: string[] = [];
async function walk(dir: string) {
  for await (const e of Deno.readDir(dir)) {
    const at = `${dir}/${e.name}`.replace(/^\.\//, '');
    if (SKIP.some((s) => at === s || at.startsWith(`${s}/`))) continue;
    if (e.isDirectory) {
      await walk(at);
      continue;
    }
    // 글로 된 것만 봐요. 그림이나 글꼴은 열어봐야 소용없어요.
    if (!/\.(ts|tsx|js|mjs|json|md|html|yml|yaml|py)$/.test(e.name)) continue;
    // 자기 자신은 빼요. 여기엔 찾으려는 글자가 당연히 적혀 있어요.
    if (at === 'scripts/check-name.ts') continue;
    const text = await Deno.readTextFile(at);
    for (const old of OLD) {
      if (text.includes(old)) found.push(`${at} — '${old}'`);
    }
  }
}
await walk('.');

if (found.length === 0) console.log('  통과  옛 이름이 아무 데도 없음');
else for (const f of found) ok(false, f);
if (found.length) fails.push(...found);

console.log(fails.length === 0 ? '\n다 통과했어요\n' : `\n${fails.length}개 실패\n`);
if (fails.length) Deno.exit(1);
