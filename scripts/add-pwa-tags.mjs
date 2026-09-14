/*
 * 내보낸 웹 화면에 "홈 화면에 추가" 정보를 넣어줘요.
 *
 *   npx expo export --platform web  를 한 다음에
 *   node scripts/add-pwa-tags.mjs
 *
 * 왜 이걸 따로 하냐면, Expo에는 원래 바깥 틀을 고치는 자리(app/+html.tsx)가
 * 있는데 그건 화면마다 파일을 만드는 방식(static)에서만 써요. 우리는 한 장짜리
 * (single) 방식이라 그 파일이 아예 안 읽혀요. 실제로 넣어보고 확인했어요.
 * app.json 의 web 칸으로 들어가는 건 제목, 언어, 설명, 색 정도뿐이에요.
 *
 * 그래서 내보낸 뒤에 직접 넣어요. 안 넣으면 폰에서 "홈 화면에 추가"를 해도
 * 이름이 영어로 뜨고 아이콘도 기본이 되고, 주소창이 그대로 남아요.
 *
 * 아이콘과 manifest.json 은 public/ 에 있어요. 그 폴더는 Expo가 알아서
 * 내보낸 자리에 그대로 복사해줘요.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const FILE = process.argv[2] ?? 'dist/index.html';
const MARK = 'pwa-tags';

/*
 * 주소를 '/school-app/manifest.json' 처럼 앞에서부터 다 적어요.
 *
 * 그냥 'manifest.json' 이라고 적으면 지금 보고 있는 주소를 기준으로 찾아요.
 * 지금은 화면 주소가 한 겹뿐이라 괜찮지만, 나중에 /thread/12 같은 두 겹짜리가
 * 생기면 엉뚱한 데를 보게 돼요. app.json 에 적어둔 값을 그대로 써요.
 */
const base = (JSON.parse(readFileSync('app.json', 'utf8')).expo.experiments?.baseUrl ?? '').replace(/\/$/, '');
const at = (name) => `${base}/${name}`;

// 화면 바탕색이에요. themes.ts 가 기본 테마로 만들어낸 값과 같아요.
const LIGHT = '#F6F5F5';
const DARK = '#0F0D0D';

const TAGS = `
  <!-- ${MARK}: scripts/add-pwa-tags.mjs 가 넣어요 -->
  <link rel="manifest" href="${at('manifest.json')}" />
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="${LIGHT}" />
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="${DARK}" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="나이스쿨" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <!-- 아이폰은 manifest 의 아이콘을 안 봐요. 따로 알려줘야 해요. -->
  <link rel="apple-touch-icon" href="${at('apple-touch-icon.png')}" />
  <style>
    /* 앱이 그려지기 전 잠깐 보이는 색이에요. 없으면 흰 화면이 번쩍해요. */
    html, body { background-color: ${LIGHT}; }
    @media (prefers-color-scheme: dark) { html, body { background-color: ${DARK}; } }
  </style>
`;

if (!existsSync(FILE)) {
  console.error(`${FILE} 이 없어요. 먼저 npx expo export --platform web 을 해주세요.`);
  process.exit(1);
}

let html = readFileSync(FILE, 'utf8');

if (html.includes(MARK)) {
  console.log('이미 들어 있어요. 그냥 둘게요.');
  process.exit(0);
}

/*
 * Expo가 app.json 의 themeColor 로 넣어둔 줄은 지워요. 밝은 화면과 어두운
 * 화면에 다른 색을 주고 싶은데, 같은 이름이 둘 있으면 앞엣것만 써요.
 */
const before = html;
html = html.replace(/[ \t]*<meta name="theme-color"[^>]*>\n?/g, '');
if (html === before) {
  console.log('(themeColor 줄은 없었어요)');
}

if (!html.includes('</head>')) {
  console.error('</head> 를 못 찾았어요. 내보낸 파일이 평소와 달라요.');
  process.exit(1);
}

html = html.replace('</head>', `${TAGS}</head>`);
writeFileSync(FILE, html);
console.log(`${FILE} 에 넣었어요.`);
