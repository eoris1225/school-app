/*
 * 다른 계정으로 갈아타면 반·번호도 같이 갈리는지 봐요.
 *
 *   node scripts/demo-setup.mjs   (시연 계정이 있어야 해요)
 *   npm run build:web
 *   node scripts/browser-relogin.mjs
 *
 * 왜 따로 보냐면, 한 기기에 앞사람 반이 남아 있었거든요. 이름은 새 사람
 * 것인데 반과 번호는 앞사람 것이 그대로 떴어요. 화면은 멀쩡해 보이고
 * 숫자만 틀린 거라 제일 알아채기 어려워요. 그 반의 시간표와 수행평가를
 * 보게 되니까 조용히 틀린 걸 보여주는 셈이고요.
 *
 * 진짜 서버에 붙어요. 브라우저 대신 node 가 물어봐요.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import pw from 'playwright';

const { chromium } = pw;
const PORT = 8803;
const BASE = `http://127.0.0.1:${PORT}`;
const DIST = new URL('../dist/', import.meta.url).pathname;
const PW_ = 'neischool-demo-2026';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };

const html = await readFile(join(DIST, 'index.html'), 'utf8');
const PREFIX = html.match(/"(\/[^"]*?)\/_expo\//)?.[1] ?? '';

const server = createServer(async (req, res) => {
  const asked = decodeURIComponent(new URL(req.url, BASE).pathname);
  const path = PREFIX && asked.startsWith(PREFIX) ? asked.slice(PREFIX.length) : asked;
  for (const p of [join(DIST, path), join(DIST, 'index.html')]) {
    try {
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
      res.end(body); return;
    } catch { /* 다음 */ }
  }
  res.writeHead(404).end();
});
await new Promise((go) => server.listen(PORT, go));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// 같은 기기를 흉내내야 해요. 창을 새로 열면 저장소가 비어서 버그가 안 나와요.
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' });
await ctx.route('**://isxbdvgvzdqpugaxqrzs.supabase.co/**', async (route) => {
  const r = route.request();
  try {
    const res = await fetch(r.url(), {
      method: r.method(), headers: r.headers(),
      body: ['GET', 'HEAD'].includes(r.method()) ? undefined : (r.postDataBuffer() ?? undefined),
    });
    await route.fulfill({
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json',
                 'access-control-allow-origin': '*' },
      body: Buffer.from(await res.arrayBuffer()),
    });
  } catch (e) { await route.fulfill({ status: 500, body: JSON.stringify({ error: String(e) }) }); }
});
const page = await ctx.newPage();

async function go() {
  await page.goto(`${BASE}${PREFIX}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
}
async function skipSetup() {
  for (let i = 0; i < 6; i++) {
    const s = page.getByText('건너뛰기').first();
    if (!(await s.isVisible().catch(() => false))) return;
    await s.click(); await page.waitForTimeout(800);
  }
}
async function signIn(email) {
  const pick = page.getByText('학교를 먼저 골라주세요').first();
  if (await pick.isVisible().catch(() => false)) {
    await pick.click(); await page.waitForTimeout(800);
    await page.getByPlaceholder(/학교/).first().fill('서일여자고등학교');
    await page.waitForTimeout(2500);
    await page.getByText('서일여자고등학교').first().click();
    await page.waitForTimeout(1200);
  }
  await page.getByText('로그인', { exact: true }).first().click();
  await page.waitForTimeout(900);
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(PW_);
  await page.getByText('로그인', { exact: true }).last().click();
  await page.waitForTimeout(5000);
  await skipSetup();
}
/** 내 정보 화면에 적힌 학년·반·번호를 읽어요. */
async function readProfile() {
  // 아바타를 눌러 들어가는 건 자꾸 빗나갔어요. 화면이 안 열린 채로 '못 찾음'
  // 이 나오면 검사가 통과해도 아무 뜻이 없어요. 주소로 바로 가요.
  await page.goto(`${BASE}${PREFIX}/profile`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const t = await page.locator('body').innerText();
  if (!/내 정보/.test(t)) throw new Error(`내 정보 화면이 아니에요: ${t.slice(0, 80)}`);
  const grade = t.match(/(\d+)학년/)?.[1] ?? '?';
  const cls = t.match(/(\d+)반/)?.[1] ?? '?';
  const no = t.match(/(\d+)번(?!호)/)?.[1] ?? '?';
  const name = t.match(/내 정보\s*\n\s*(\S+)/)?.[1] ?? '';
  return { grade, cls, no, name };
}
async function signOut() {
  await page.getByText(/로그아웃/).first().click({ force: true });
  await page.waitForTimeout(1200);
  for (const label of ['로그아웃', '나가기', '확인']) {
    const b = page.getByText(label).last();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
  }
  await page.waitForTimeout(4000);
}

let bad = 0;
console.log('\n== 1) 영어 선생님(1학년 5반)으로 먼저 들어가요');
await go();
await signIn('demo-teacher-eng@example.com');
const first = await readProfile();
console.log(`   ${first.name} → ${first.grade}학년 ${first.cls}반`);

console.log('\n== 2) 나갔다가 학생(2학년 3반 7번)으로 들어와요');
await signOut();
await signIn('demo-student@example.com');
const second = await readProfile();
console.log(`   ${second.name} → ${second.grade}학년 ${second.cls}반 ${second.no}번`);

const ok = second.grade === '2' && second.cls === '3' && second.no === '7';
console.log(`\n   ${ok ? '통과' : '실패'}  갈아탄 계정의 반·번호가 나와야 해요 (2학년 3반 7번)`);
if (!ok) { bad++; console.log(`   지금 화면: ${JSON.stringify(second)}`); }

await browser.close();
server.close();
console.log(bad ? `\n실패 ${bad}건\n` : '\n다 통과했어요\n');
process.exit(bad ? 1 : 0);
