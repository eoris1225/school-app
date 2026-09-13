/*
 * 사진 고르고 줄이기를 진짜 브라우저에서 해봐요.
 *
 *   npm run build:web
 *   node scripts/browser-photo.mjs
 *
 * 이 버그는 브라우저에서만 살아요. 캔버스가 있어야 나오거든요.
 *
 *   Failed to execute 'createImageData' on 'CanvasRenderingContext2D':
 *   The source height is zero or not a number.
 *
 * 줄일 때 안 정하는 쪽에 null 을 넘겨서 난 거예요. expo-image-manipulator 의
 * 타입은 null 을 받는다고 하고 문서에도 그렇게 적혀 있는데, 웹 구현은
 * undefined 만 걸러내요. 폰에서는 멀쩡했고 웹에서 사진 보낼 때만 터졌어요.
 *
 * 그래서 흉내로는 안 잡혀요. 진짜 파일을 골라야 나와요.
 *
 * 서버와 시험용 사진은 이 스크립트가 알아서 만들고 치워요. 미리 준비해둘
 * 것도, 지우면 안 되는 것도 없어요.
 */
import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { deflateSync } from 'node:zlib';

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

/** 긴 변이 1600을 넘는 png 를 하나 만들어요. 안 넘으면 줄이는 길로 안 들어가요. */
function bigPng(w, h) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    return Buffer.concat([
      Buffer.from(new Uint32Array([data.length]).buffer).reverse(),
      body,
      Buffer.from(new Uint32Array([crc(body)]).buffer).reverse(),
    ]);
  };
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const row = y * (1 + w * 3);
    for (let x = 0; x < w; x++) {
      const at = row + 1 + x * 3;
      raw[at] = (x * 7 + y * 3) % 256;
      raw[at + 1] = (x * 3) % 256;
      raw[at + 2] = (y * 5) % 256;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

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

const dir = await mkdtemp(join(tmpdir(), 'photo-check-'));
const photoPath = join(dir, 'big.png');
await writeFile(photoPath, bigPng(2400, 1350));

const T = 'fake-token';
const SCHOOL = { office: 'G10', code: '7430062', name: '서일여자고등학교', officeName: '대전광역시교육청' };
const ME = {
  id: 'u1', role: 'student', name: '이채율', subjects: [], teaches: [],
  school: SCHOOL, cls: '2-3', no: 12, swaps: {}, setupSeen: true,
  teach: { classes: [], edits: {} }, allergies: [], myEvents: [], accent: null, schemePref: null,
};
const only = { id: 'm1', from: 'student', author: '이채율', text: '범위가 어디까지예요?', at: '2026-09-13T08:12:00Z', image: null };
const THREAD = {
  id: 't1', subject: '수학', student: { name: '이채율', cls: '2-3', no: 12 },
  teacher: { id: 'u2', name: '허유미' }, last: only,
  count: 1, unread: false, pending: true, at: only.at,
};

/*
 * 브라우저 경로는 안 박아둬요. 환경마다 달라요. 기본으로 못 찾으면
 * PLAYWRIGHT_BROWSERS_PATH 를 보고 한 번 더 해봐요.
 */
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

let sent = null;
await page.route('**/functions/v1/neis*', (r) => {
  const k = new URL(r.request().url()).searchParams.get('kind');
  let out = '{}';
  if (k === 'thread') {
    if (r.request().method() === 'POST') {
      sent = r.request().postData() ?? '';
      out = JSON.stringify({ message: { ...only, id: 'm2', text: '' } });
    } else out = JSON.stringify({ thread: THREAD, messages: [only] });
  } else if (k === 'threads') out = JSON.stringify({ threads: [THREAD] });
  else if (k === 'me' || k === 'my-school' || k === 'my-settings') out = JSON.stringify({ me: ME });
  else if (k === 'bells') out = JSON.stringify({ bells: null });
  else if (k === 'meal') out = JSON.stringify({ meals: [] });
  else if (k === 'timetable') out = JSON.stringify({ lessons: [] });
  else if (k === 'schedule') out = JSON.stringify({ events: [] });
  else if (k === 'assessments') out = JSON.stringify({ assessments: [] });
  else if (k === 'classes') out = JSON.stringify({ classes: [{ grade: 2, cls: '3' }] });
  else if (k === 'push') out = JSON.stringify({ ready: false, key: '', count: 0 });
  r.fulfill({ status: 200, contentType: 'application/json', body: out });
});

// 사람이 쓰는 길로 들어가요. 쪽지 상세는 눌러서 들어가는 화면이에요.
await page.goto(`${BASE}${PREFIX}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.getByRole('tab', { name: /커뮤니티/ }).last().click();
await page.waitForTimeout(2000);
await page.getByText(only.text).first().click();
await page.waitForTimeout(2500);

console.log('\n=== 큰 사진을 골라서 줄이기 ===');
{
  const chooser = page.waitForEvent('filechooser');
  await page.getByLabel('사진 넣기').click();
  await (await chooser).setFiles(photoPath);
  await page.waitForTimeout(4000);

  const txt = await page.evaluate(() => document.body.innerText);
  /*
   * 콘솔만 보면 안 돼요. 화면이 try/catch 로 잡아서 글로 띄우거든요.
   * 실제로 여기서 한 번 속았어요 — 콘솔은 깨끗한데 사진은 안 붙었어요.
   * 붙었는지를 보는 게 진짜 검사예요.
   */
  ok(/사진 한 장/.test(txt), '고른 사진이 붙음');
  ok(!/createImageData|CanvasRenderingContext2D/i.test(txt), '영어 오류 메시지가 화면에 없음');
  const size = txt.match(/(\d+)x(\d+)/);
  ok(size?.[1] === '1600', `긴 변이 1600으로 줄어듦 (${size?.[0]})`);
  ok(size?.[2] === '900', `비율이 그대로 (2400x1350 -> ${size?.[0]})`);
}

console.log('\n=== 보내지는지 ===');
{
  await page.getByLabel('보내기').last().click();
  await page.waitForTimeout(2500);
  ok(sent !== null, '서버로 보냄');
  /*
   * 'image' 라는 글자만 찾으면 안 돼요. 그건 칸 이름이라 사진이 안 실려도
   * 늘 있어요. 실제로 여기서 속았어요 — 검사는 통과하는데 서버는 "사진이
   * 없어요" 라고 답하고 있었어요.
   *
   * 진짜 파일이 실렸는지는 filename= 이 말해줘요. 그게 있어야 서버에서
   * File 로 읽혀요. 파일 대신 객체를 넣으면 글자로 바뀌어 들어가요.
   */
  ok(/filename=/.test(sent ?? ''), '진짜 파일로 실림 (filename=)');
  ok(!/\[object Object\]/.test(sent ?? ''), '객체가 글자로 바뀌어 들어가지 않음');
  ok(/image\/jpeg/.test(sent ?? ''), '사진 형식이 실림');
}

await browser.close();
server.close();
await rm(dir, { recursive: true, force: true });

console.log(fails.length === 0 ? '\n다 통과했어요\n' : `\n${fails.length}개 실패\n${fails.map((f) => '  - ' + f).join('\n')}\n`);
process.exit(fails.length ? 1 : 0);
