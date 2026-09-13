# scripts/

## 지우면 안 되는 것

**없어요.** 그게 규칙이에요.

한동안 시험 계정 두 개를 정해두고 "이건 지우면 안 돼요" 라고 해뒀어요.
그게 어디에 적혀 있었냐면 채팅에요. 당연히 지워졌고 라이브 검사가 통째로
멈췄어요. 기억해야 굴러가는 건 언젠가 안 굴러가요.

지금은 `scripts/live-check.mjs` 가 돌 때마다 계정을 새로 만들어요.
이름이 `delete-me-` 로 시작해요.

    delete-me-1789309469143-a@example.com
    delete-me-1789309470160-b@example.com

**`delete-me-` 로 시작하는 계정은 전부 지워도 돼요.** 다음에 돌리면 새로
만들어요. Supabase 대시보드에서 보이는 대로 치우세요.

## 검사 종류

세 가지가 있어요. 잡는 게 서로 달라요.

| | 무엇을 보나 | 못 잡는 것 |
|---|---|---|
| `check-*.ts` (deno) | 계산 규칙. 시각, 과목 분류, 한글 조사 | 화면, 서버 |
| `browser-*.mjs` (playwright) | 실제로 그려진 화면, 캔버스, 좌표, 탭을 오가는 것 | 진짜 서버 |
| `live-check.mjs` | **진짜 서버.** 표 권한, 칸 이름, method 목록 | — |

라이브 검사가 따로 있는 이유가 있어요. 브라우저 검사는 서버를 흉내내는데,
흉내는 우리가 기대한 대로만 답해요. 그래서 이 넷을 한 번도 못 잡았어요.

- PATCH 가 맨 위 method 목록에 없어서 405
- `assessments` 표에 update 권한이 없어서 502
- `allergies` 가 "바꿀 것이 없어요" 검사 목록에 안 적혀서 400
- `push_subs` 표에 update 권한이 없어서 500 (덮어쓰기가 update 를 써요)
- 사진을 `FormData` 에 객체로 넣어서 "사진이 없어요" (폰은 알아듣고 브라우저는
  글자로 바꿔요. 흉내내는 서버는 뭐가 오든 받아주니 안 걸려요)

넷 다 흉내내는 검사는 전부 통과했어요. **표에 칸을 늘렸으면 라이브 검사를
꼭 한 번 돌려보세요.**

## 돌리는 법

```bash
# 계산 규칙 (deno)
deno run --allow-read --sloppy-imports scripts/check-bells.ts
deno run --allow-read --sloppy-imports scripts/check-time.ts
deno run --allow-read --sloppy-imports scripts/check-target.ts
deno run --allow-read --sloppy-imports scripts/check-teacher-week.ts
deno run --allow-read scripts/check-subjects.ts
deno run --allow-read --sloppy-imports scripts/check-korean.ts
deno run --allow-read scripts/check-palette.ts

# 서버 쪽 (deno) — GitHub Actions 도 이걸 돌려요
cd supabase/functions && deno test --allow-env --allow-read _shared/

# 브라우저
npm run build:web
node scripts/browser-photo.mjs     # 사진 고르고 줄이고 보내기
node scripts/browser-return.mjs    # 탭에 돌아오면 낡은 내용이 갈리는지
node scripts/browser-live.mjs      # 쪽지가 새로고침 없이 갈리는지
node scripts/browser-answer.mjs    # 답변완료를 선생님이 직접 누르는지

# 진짜 서버
TEACHER_CODE=선생님코드 node scripts/live-check.mjs
```

`browser-photo.mjs` 는 playwright 가 있어야 해요. 저장소 의존성에는 안
넣었어요 (브라우저까지 따라와서 무거워요). 없으면 `npm i -D playwright`
하세요. 서버와 시험용 사진은 스크립트가 알아서 만들고 치워요.

사진 줄이기를 왜 브라우저에서 보냐면, 그 버그가 캔버스에만 살거든요.

    Failed to execute 'createImageData' on 'CanvasRenderingContext2D':
    The source height is zero or not a number.

줄일 때 안 정하는 쪽에 `null` 을 넘겨서 난 거예요. 타입도 문서도 null 을
받는다고 하는데 웹 구현은 `undefined` 만 걸러내요. **폰에서는 멀쩡했고
웹에서 사진 보낼 때만 터졌어요.** 흉내로는 안 잡혀요.

`browser-live.mjs` 는 **기다리기만 해서** 갈리는지 봐요. 서버 답을 도중에
바꿔놓고 아무것도 안 누르고 기다려요. 갈리면 새로고침이 필요 없다는 뜻이에요.
화면을 떠난 뒤에는 그만 물어보는지도 같이 재요. 안 보는 화면 때문에 배터리와
데이터를 쓰면 안 되니까요.

`browser-return.mjs` 는 **낡은 화면**을 봐요. 탭 화면은 한 번 열리면 안
닫혀서, 처음 받아온 값이 계속 남아요. 화면은 멀쩡해 보이고 내용만 낡은
거라 제일 알아채기 어려워요. 서버 답을 도중에 바꿔놓고 탭을 나갔다 들어와서
갈리는지 재요.

`TEACHER_CODE` 는 Supabase 대시보드 > Edge Functions > Secrets 에 있어요.
**영문·숫자만 돼요.** 한글로 넣으면 HTTP 헤더에 못 실려서 조용히 실패해요.

## 나머지

| 파일 | 하는 일 |
|---|---|
| `add-pwa-tags.mjs` | `expo export` 뒤에 manifest·아이콘 태그를 끼워 넣어요 (`npm run build:web` 이 부름) |
| `make-icon.py` | 앱 아이콘 png 들을 만들어요 |
| `pick-palette.ts` | 새 테마 색이 대비 4.5를 넘는지 재봐요 |
| `reset-project.js` | Expo 가 만들어준 초기화 스크립트 |
