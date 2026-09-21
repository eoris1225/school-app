/*
 * 커스텀 컬러가 실제로 손가락에 반응하는지 봐요.
 *
 *   npm run build:web
 *   node scripts/browser-color.mjs
 *
 * 색상환과 진하기 막대는 GestureDetector 로 돼 있어요. 그게 팝업(Modal)
 * 안에 들어 있고요. 팝업은 안드로이드에서 딴 창으로 떠서, 손가락을
 * 알아듣는 판(GestureHandlerRootView)을 팝업 안에 또 깔아줘야 해요.
 *
 * 그 판이 없으면 웹에서는 멀쩡하고 빌드한 앱에서만 안 먹어요. 그래서
 * 이 검사만으로는 그 사고를 못 잡아요. 그건 scripts/check-gesture-root.ts
 * 가 세요. 여기서는 판을 깐 뒤에도 웹이 그대로 돌아가는지, 그리고
 * 색상환 계산과 저장이 맞는지를 봐요.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PORT = 8803;
const BASE = `http://127.0.0.1:${PORT}`;
const DIST = new URL('../dist/', import.meta.url).pathname;

async function loadChromium() {
  const places = ['playwright', '@playwright/test', '/opt/node22/lib/node_modules/playwright/index.js'];
  for (const where of places) {
    try {
      const mod = await import(where);
      const got = mod.chromium ?? mod.default?.chromium;
      if (got) return got;
    } catch {
      /* 다음 데를 봐요 */
    }
  }
  console.log('playwright 가 없어요.  npm i -D playwright  하고 다시 돌려주세요.');
  process.exit(2);
}
const chromium = await loadChromium();

const fails = [];
const ok = (c, m) => {
  console.log(`${c ? '  통과' : '  실패'}  ${m}`);
  if (!c) fails.push(m);
};

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const html = await readFile(join(DIST, 'index.html'), 'utf8');
const PREFIX = html.match(/"(\/[^"]*?)\/_expo\//)?.[1] ?? '';

const server = createServer(async (req, res) => {
  const asked = decodeURIComponent(new URL(req.url, BASE).pathname);
  const path = PREFIX && asked.startsWith(PREFIX) ? asked.slice(PREFIX.length) : asked;
  for (const p of [join(DIST, path), join(DIST, 'index.html')]) {
    try {
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
      res.end(body);
      return;
    } catch {
      /* 다음 걸로 */
    }
  }
  res.writeHead(404).end();
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const T = 'fake-token';
const SCHOOL = { office: 'G10', code: '7430062', name: '서일여자고등학교', officeName: '대전광역시교육청' };
const ME = {
  id: 'u1', role: 'student', name: '이채율', subjects: [], teaches: [],
  school: SCHOOL, cls: '2-3', no: 12, swaps: {}, setupSeen: true,
  teach: { classes: [], edits: {} }, allergies: [], myEvents: [], accent: null, schemePref: null,
};
const sent = [];

const browser = await chromium.launch().catch(async () => {
  const at = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!at) throw new Error('브라우저를 못 찾았어요. npx playwright install chromium 을 해보세요');
  return await chromium.launch({ executablePath: `${at}/chromium` });
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

await page.addInitScript(
  (s) => localStorage.setItem('sb-isxbdvgvzdqpugaxqrzs-auth-token', s),
  JSON.stringify({
    access_token: T, token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
    user: { id: 'u1', email: 's@t.com', aud: 'authenticated', role: 'authenticated' },
  }),
);
await page.route('**/auth/v1/**', (r) =>
  r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ access_token: T, user: { id: 'u1' }, expires_in: 3600, refresh_token: 'r' }) }),
);
await page.route('**/functions/v1/neis*', (r) => {
  const k = new URL(r.request().url()).searchParams.get('kind');
  let out = '{}';
  if (k === 'my-settings') {
    sent.push(JSON.parse(r.request().postData() ?? '{}'));
    out = JSON.stringify({ me: ME });
  } else if (k === 'me' || k === 'my-school') out = JSON.stringify({ me: ME });
  else if (k === 'timetable') out = JSON.stringify({ lessons: [] });
  else if (k === 'bells') out = JSON.stringify({ bells: null });
  else if (k === 'meal') out = JSON.stringify({ meals: [] });
  else if (k === 'schedule') out = JSON.stringify({ events: [] });
  else if (k === 'assessments') out = JSON.stringify({ assessments: [] });
  else if (k === 'threads') out = JSON.stringify({ threads: [] });
  else if (k === 'classes') out = JSON.stringify({ classes: [{ grade: 2, cls: '3' }] });
  else if (k === 'push') out = JSON.stringify({ ready: false, key: '', count: 0 });
  r.fulfill({ status: 200, contentType: 'application/json', body: out });
});

/** 미리보기 네모('이 색으로')가 지금 무슨 색인지. */
const previewColor = () =>
  page.getByText('이 색으로', { exact: true }).first().evaluate((el) =>
    getComputedStyle(el.parentElement ?? el).backgroundColor);

/** 상자 한가운데에서 dx, dy 만큼 떨어진 자리를 밀어요. */
async function drag(label, dx, dy) {
  const box = await page.getByLabel(label).first().boundingBox();
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  return box;
}

await page.goto(`${BASE}${PREFIX}/profile`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

console.log('\n=== 팝업이 열리는지 ===');
{
  await page.getByText('커스텀 컬러', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  ok(await page.getByLabel('색상환').first().isVisible(), '색상환이 보임');
  ok(await page.getByLabel('진하기').first().isVisible(), '진하기 막대가 보임');
  ok(await page.getByText('고르기', { exact: true }).first().isVisible(), '고르기 버튼이 보임');
}

console.log('\n=== 색상환을 밀면 색이 따라오는지 ===');
{
  const before = await previewColor();
  // 가운데는 구멍이에요. 오른쪽 위(대각선)로 밀어서 고리 위를 짚어요.
  await drag('색상환', 70, -70);
  const after = await previewColor();
  ok(!!before && !!after, `미리보기 색을 잴 수 있음 (${before} -> ${after})`);
  ok(before !== after, '색상환을 밀었더니 미리보기 색이 바뀜');
}

console.log('\n=== 진하기를 밀면 색이 따라오는지 ===');
{
  const before = await previewColor();
  await drag('진하기', -80, 0);
  const after = await previewColor();
  ok(before !== after, `진하기를 밀었더니 미리보기 색이 바뀜 (${before} -> ${after})`);
}

console.log('\n=== 고르면 앱 색이 갈리는지 ===');
let picked = '';
{
  picked = await previewColor();
  await page.getByText('고르기', { exact: true }).first().click();
  await page.waitForTimeout(1500);

  ok(!(await page.getByLabel('색상환').first().isVisible().catch(() => false)), '팝업이 닫힘');

  /*
   * 담은 값은 고른 색 그대로예요. 화면에 칠해지는 색은 그것과 달라요.
   * buildPalette 가 글씨가 읽히게 진하기를 손봐서 쓰거든요. 그래서
   * 담긴 값과 화면 색을 곧바로 견주면 안 돼요.
   */
  const kept = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('my-accent') ?? 'null'); } catch { return null; }
  });
  ok(/^#[0-9A-F]{6}$/i.test(kept ?? ''), `기기에 담김 (${kept})`);

  const body = sent.find((b) => 'accent' in b);
  ok(!!body, `계정에도 올라감 (${JSON.stringify(body ?? {})})`);
  ok(body?.accent?.toLowerCase() === (kept ?? '').toLowerCase(), '담은 색과 올린 색이 같음');

  // 고른 색이 실제로 화면에 쓰이는지. 직접 고른 색은 동그라미 줄 끝에 붙어요.
  const mine = await page.getByLabel('직접 고른 색, 눌러서 바꾸기').first()
    .evaluate((el) => getComputedStyle(el.querySelector('div') ?? el).backgroundColor)
    .catch(() => '');
  ok(mine === picked, `직접 고른 색 동그라미가 그 색임 (${mine} / ${picked})`);
}

console.log('\n=== 다시 열면 그 색 자리에서 시작하는지 ===');
{
  // 늘 같은 데서 시작하면 "내 색이 어디였지" 를 매번 다시 찾아야 해요.
  await page.getByText('커스텀 컬러', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  const back = await previewColor();
  ok(back === picked, `아까 고른 색에서 시작함 (${back} / ${picked})`);
}

await browser.close();
server.close();

console.log(fails.length === 0 ? '\n다 통과했어요\n' : `\n${fails.length}개 실패\n${fails.map((f) => '  - ' + f).join('\n')}\n`);
process.exit(fails.length ? 1 : 0);
