/*
 * 쪽지 화면이 새로고침 없이 갈리는지 봐요.
 *
 *   npm run build:web
 *   node scripts/browser-live.mjs
 *
 * 상대가 답을 보내도 내 화면은 그대로였어요. 새로고침을 해야 보였고요.
 * 대화하는 화면에서 그건 좀 그렇죠.
 *
 * 진짜 실시간(Realtime)은 못 써요. 우리 표는 RLS를 켜고 정책을 안 만들어서
 * 앱이 직접 못 읽거든요. 그래서 보고 있는 동안만 몇 초마다 다시 물어봐요.
 * 여기서는 서버 답을 도중에 바꿔놓고, 손대지 않고 기다리기만 해서 갈리는지
 * 재요. 기다려서 갈리면 그게 곧 새로고침이 필요 없다는 뜻이에요.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

import { join, extname } from 'node:path';


const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const DIST = new URL('../dist/', import.meta.url).pathname;

/*
 * playwright 를 어디에 깔았든 찾아요.
 *
 * 저장소 의존성에는 안 넣었어요. 브라우저까지 따라와서 무겁고, 앱을 받는
 * 사람은 쓸 일이 없거든요. 없으면 없다고 알려주고 끝내요.
 */
async function loadChromium() {
  const places = ['playwright', '@playwright/test', '/opt/node22/lib/node_modules/playwright/index.js'];
  for (const where of places) {
    try {
      const mod = await import(where);
      // CommonJS 로 깔린 판은 chromium 이 default 안에 들어 있어요.
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

/*
 * 앱이 어느 주소 밑에 깔리는지 알아내요.
 *
 * GitHub Pages 는 /school-app 밑에 얹어요(EXPO_BASE_URL). 그 값을 모르고
 * 루트에 붙이면 자바스크립트를 못 찾아서 앱이 아예 안 떠요. 화면은 하얗고요.
 * 여기에 '/school-app' 이라고 박아두면 나중에 주소가 바뀔 때 또 여기서
 * 막혀요. 만들어진 파일이 이미 알고 있으니 거기서 읽어요.
 */
const html = await readFile(join(DIST, 'index.html'), 'utf8');
const PREFIX = html.match(/"(\/[^"]*?)\/_expo\//)?.[1] ?? '';

const server = createServer(async (req, res) => {
  // expo 는 한 장짜리(single)로 내보내요. 모르는 주소는 index.html 로 되돌려요.
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
const msg = (from, author, text, at) => ({ id: `m${at}`, from, author, text, at, image: null });

const asked = msg('student', '이채율', '수행평가 범위가 어디까지예요?', '2026-09-13T08:12:00Z');
/** 서버가 지금 아는 대화. 검사 도중에 답을 얹어요. */
let messages = [asked];
const thread = () => ({
  id: 't1', subject: '수학', student: { name: '이채율', cls: '2-3', no: 12 },
  teacher: { id: 'u2', name: '허유미' },
  last: messages[messages.length - 1], count: messages.length,
  unread: false, pending: messages.length === 1, at: messages[messages.length - 1].at,
});

let reads = 0;

const browser = await chromium.launch().catch(async () => {
  const at = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!at) throw new Error('브라우저를 못 찾았어요. npx playwright install chromium 을 해보세요');
  return await chromium.launch({ executablePath: `${at}/chromium` });
});
const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();

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
  if (k === 'thread') {
    reads += 1;
    out = JSON.stringify({ thread: thread(), messages });
  } else if (k === 'threads') out = JSON.stringify({ threads: [thread()] });
  else if (k === 'me' || k === 'my-school' || k === 'my-settings') out = JSON.stringify({ me: ME });
  else if (k === 'bells') out = JSON.stringify({ bells: null });
  else if (k === 'meal') out = JSON.stringify({ meals: [] });
  else if (k === 'timetable') out = JSON.stringify({ lessons: [] });
  else if (k === 'schedule') out = JSON.stringify({ events: [] });
  else if (k === 'assessments') out = JSON.stringify({ assessments: [] });
  else if (k === 'classes') out = JSON.stringify({ classes: [{ grade: 2, cls: '3' }] });
  else if (k === 'teachers') out = JSON.stringify({ teachers: [] });
  else if (k === 'push') out = JSON.stringify({ ready: false, key: '', count: 0 });
  r.fulfill({ status: 200, contentType: 'application/json', body: out });
});

const text = () => page.evaluate(() => document.body.innerText);

await page.goto(`${BASE}${PREFIX}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.getByRole('tab', { name: /커뮤니티/ }).last().click();
await page.waitForTimeout(2000);
await page.getByText(asked.text).first().click();
await page.waitForTimeout(2500);

console.log('\n=== 답이 오면 가만히 있어도 뜨는지 ===');
{
  ok(/수행평가 범위/.test(await text()), '내가 보낸 것이 보임');
  ok(!/교과서 132쪽/.test(await text()), '아직 답은 없음');

  // 선생님이 다른 데서 답을 보낸 셈이에요. 화면은 아무도 안 건드려요.
  messages = [...messages, msg('teacher', '허유미', '교과서 132쪽부터예요.', '2026-09-13T09:10:00Z')];

  // 5초마다 보니까 넉넉히 기다려요. 새로고침도, 누르는 것도 없어요.
  await page.waitForTimeout(9000);
  ok(/교과서 132쪽/.test(await text()), '손 안 대도 답이 떴음');
}

console.log('\n=== 화면을 떠나면 그만 물어보는지 ===');
{
  await page.goBack();
  await page.waitForTimeout(1500);
  const before = reads;
  await page.waitForTimeout(9000);
  // 목록 화면은 20초마다라서 9초 동안은 한 번도 안 와야 맞아요.
  ok(reads === before, `쪽지 화면을 떠나니 그만 물어봄 (${reads - before}번 더 물어봄)`);
}

await browser.close();
server.close();

console.log(fails.length === 0 ? '\n다 통과했어요\n' : `\n${fails.length}개 실패\n${fails.map((f) => '  - ' + f).join('\n')}\n`);
process.exit(fails.length ? 1 : 0);
