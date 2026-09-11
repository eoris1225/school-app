# 서버 (Supabase Edge Function)

앱과 NEIS 사이에 서는 함수예요. **NEIS 인증키를 앱에 넣지 않으려고** 있어요.

```
앱 (키 없음)  ──▶  이 함수 (키 있음)  ──▶  NEIS 열린 API
```

앱에 키를 넣으면 안 되는 이유는, Expo가 `EXPO_PUBLIC_` 값을 번들에 그대로
박아넣기 때문이에요. 웹으로 내보내면 브라우저에서 바로 꺼내 볼 수 있어요.

## 파일

    supabase/
      config.toml                  어떤 함수를 배포할지
      migrations/                  표 만드는 SQL
      functions/
        deno.json / deno.lock      Deno 설정과 테스트용 의존성
        .env.example               로컬 환경변수 견본 (.env는 커밋 안 됨)
        _shared/neis.ts            NEIS 호출 + 응답 변환 (핵심)
        _shared/assessments.ts     수행평가를 표에 담고 꺼내기
        _shared/neis_test.ts       변환 함수 테스트
        neis/index.ts              HTTP 입구, 입력값 검사, 오류 처리

## 부르는 법

| 요청 | 받는 것 |
|---|---|
| `?kind=meal&from=2026-09-07&to=2026-09-11` | 급식 (중식·석식) |
| `?kind=timetable&grade=2&class=3&from=…&to=…` | 시간표 |
| `?kind=schedule&from=2026-09-01&to=2026-09-30` | 학사일정 |
| `?kind=classes&year=2026` | 학년·반 목록 |
| `?kind=school&name=서일여자고등학교` | 학교 검색 (코드 찾을 때) |
| `?kind=assessments&from=…&to=…` | 수행평가 목록 (NEIS 아님, 우리 표) |

학교 검색 말고는 전부 `office` 와 `school` 을 같이 보낼 수 있어요.
앱에서 학교를 고르면 이 두 값이 실려 와요.

    ?kind=meal&from=2026-09-11&office=G10&school=7430062

안 보내면 시범운영 학교(서일여고)로 답해요. 모양이 안 맞으면 400이에요.
`office` 는 'G10' 처럼 영문 한 글자 + 숫자 두 자리, `school` 은 숫자 일곱 자리예요.

학교 검색은 넓게 찾으면 300곳이 넘어서 앞에서 30곳만 보내고
`total` 로 전체가 몇 곳인지 알려줘요.

`to`를 빼면 `from` 하루만 받아요. `year`와 `term`을 빼면 오늘 날짜로 정해요.

응답은 이런 모양이에요. NEIS의 `<br/>` 덩어리나 `20260911` 같은 건 전부 걷어냈어요.

```json
{ "meals": [ {
    "date": "2026-09-11",
    "type": "lunch",
    "items": [ { "name": "카레라이스", "allergy": [2,5,6,10,12,13,16,18] } ],
    "kcal": 876, "people": 501,
    "origin": [ { "item": "쌀", "from": "국내산" } ],
    "nutrition": [ { "item": "단백질(g)", "from": "21.9" } ]
} ] }
```

급식이 없는 날은 오류가 아니라 `{"meals": []}` 예요. 빈 화면으로 보여주면 돼요.

## 수행평가 — 우리 표에 담아요

NEIS에는 수행평가가 없어요. 그래서 선생님이 앱에서 등록하고 우리 표에 담아요.
그래야 등록한 선생님 기기 밖에서도, 학생들에게도 보여요.

| 하는 일 | 부르는 법 | 누가 |
|---|---|---|
| 보기 | `GET ?kind=assessments&from=…&to=…` | 누구나 |
| 등록 | `POST ?kind=assessments` | 선생님 코드가 있어야 |
| 지우기 | `DELETE ?kind=assessments&id=…` | 선생님 코드가 있어야 |

등록할 때 보내는 내용이에요.

```json
{ "date": "2026-09-20", "title": "이차함수 수행평가",
  "subject": "수학", "grades": [2], "classes": ["1","3"] }
```

`grades`가 비면 전 학년, `classes`가 비면 그 학년 전체예요.

### 선생님 코드

아직 로그인이 없어요. 그냥 두면 **주소만 아는 누구나 전교생 달력에 아무거나
올리거나 지울 수 있어요.** 그래서 등록과 삭제에는 암호를 하나 걸어뒀어요.

```bash
npx supabase secrets set TEACHER_CODE=정한암호
```

**영문과 숫자로만 정하세요.** HTTP 헤더에는 한글을 실을 수 없어서 한글로 정하면
아무리 맞게 넣어도 통과가 안 돼요. 그런 경우 함수가 "영문과 숫자로만 다시
정해주세요" 라고 알려줘요.

코드를 설정하지 않으면 등록과 삭제가 **전부 막혀요.** 열어두는 것보다 안전해요.
읽기는 코드 없이도 돼요. 수행평가는 원래 학생이 다 보는 거니까요.

이건 임시 방편이에요. 코드를 아는 사람은 누구나 선생님이 될 수 있으니,
나중에 진짜 로그인으로 바꾸는 게 맞아요.

### 표 만들기

`supabase/migrations/` 에 SQL이 있어요. 처음 한 번만 돌리면 돼요.
CLI로 밀어도 되고, 대시보드 SQL Editor에 붙여 넣어도 돼요.
(붙여 넣는 쪽이 DB 비밀번호를 안 물어봐서 편해요)

표에는 RLS를 켜고 정책을 하나도 만들지 않아요. 그러면 함수만 건드릴 수 있어요.
앱이 들고 있는 키로는 아무것도 못 해요.

## 오류

| 상태 | 뜻 |
|---|---|
| 400 | 우리가 잘못 불렀어요 (날짜 모양, 빠진 값, 200일 초과 등) |
| 502 | 인증키 문제예요 (`ERROR-290` 등). 시크릿을 확인하세요 |
| 405 | GET 말고 다른 방법으로 불렀어요 |

## 배포

### 자동 (보통은 이것만 알면 돼요)

`supabase/functions/` 가 바뀐 채로 main에 올라오면 GitHub Actions가 알아서 올려요.
`.github/workflows/deploy-function.yml` 이에요.

올리기 전에 타입 검사와 테스트를 먼저 돌려요. 깨진 코드가 올라가면
급식도 시간표도 통째로 멈추니까요. 올린 뒤에는 함수가 실제로 답하는지 확인해요.

서버를 안 건드린 커밋에서는 돌지 않아요. 지금까지 커밋 21개 중 서버를 건드린 건
3개뿐이라, 매번 돌리면 시간만 쓰고 얻는 게 없어요.

처음 한 번만 저장소 시크릿 두 개를 넣어주세요.
(Settings > Secrets and variables > Actions > New repository secret)

| 이름 | 값 |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens 에서 발급 |
| `SUPABASE_PROJECT_REF` | 대시보드 주소의 `/project/` 뒤에 있는 값 |

**토큰은 최대 1년이에요.** 만료되면 이 워크플로가 실패해요. 그때 새로 발급해서
`SUPABASE_ACCESS_TOKEN` 만 바꿔주면 돼요. 그리고 이 토큰은 계정 비밀번호와 같은
힘을 가져요. 새어나간 것 같으면 계정 페이지에서 바로 Revoke 하세요.

### 손으로 올리기

시크릿을 아직 안 넣었거나, 급하게 올려야 할 때요.
Supabase 프로젝트가 아직 없으면 supabase.com 에서 하나 만들고 시작해요.

```bash
# 설치는 안 해도 돼요. npx가 알아서 받아와요.
npx supabase login --token <발급받은 토큰>
npx supabase link --project-ref <프로젝트 ref>

# 키 넣기. 이 값은 Supabase 서버에만 저장되고 저장소에는 안 남아요.
# 한 번만 하면 돼요. 함수를 다시 올려도 키는 그대로 있어요.
npx supabase secrets set NEIS_API_KEY=받은키

# --use-api 는 Docker 없이 올리는 방법이에요.
npx supabase functions deploy neis --use-api
```

`supabase login` 은 브라우저를 거치는 방법도 있지만, 태블릿처럼 긴 주소를
복사하기 어려운 환경에서는 `--token` 이 훨씬 편해요.

배포되면 주소가 이렇게 나와요.

    https://<프로젝트 ref>.supabase.co/functions/v1/neis?kind=meal&from=2026-09-11

## 고칠 때

변환 규칙을 건드렸으면 테스트부터 돌려요.

```bash
cd supabase/functions
deno test --allow-net _shared/neis_test.ts
```

함수를 직접 띄워서 눌러볼 수도 있어요. 키 없이 띄우면 응답이 5행에서 잘리지만
모양을 확인하기에는 충분해요.

```bash
cd supabase/functions
deno run --allow-net --allow-env neis/index.ts
curl 'http://localhost:8000/?kind=meal&from=2026-09-11'
```

## 알아두면 좋은 것

- **`accept: application/json` 헤더를 붙이면 NEIS가 500을 뱉어요.** 헤더 없이 불러야 해요.
- **인증키가 없으면 응답이 5행에서 잘려요.** `pSize`를 올려도, `pIndex`로 넘겨도 안 돼요.
- NEIS에 **조식은 없어요.** 중식·석식만 올라와요.
- 시간표에 **교시 시각이 없어요.** 몇 시에 시작하는지는 앱이 들고 있어야 해요.
- **수행평가·성적·공지는 NEIS에 아예 없어요.** 우리가 직접 저장해야 해요.

자세한 조사 내용은 저장소 루트의 `NEIS.md` 에 있어요.

## 앱이 이 함수를 어떻게 부르나

앱 쪽 코드는 이렇게 나뉘어 있어요.

    src/lib/api.ts          이 함수를 부르는 곳. 주소와 타입, 오류 구분
    src/lib/use-remote.ts   불러오는 동안의 상태(로딩·오류·다시시도)
    src/lib/timetable.ts    받은 교시 목록을 요일별로 펴는 helper

함수 주소는 `src/lib/api.ts` 에 그대로 적어뒀어요. 비밀이 아니거든요.
공개된 엔드포인트라 누가 봐도 되고, 진짜 숨겨야 하는 NEIS 인증키는
이 주소 너머 서버 안에 있어요.

화면은 한 주치를 한 번에 받아둬요. 요일을 눌러도 다시 부르지 않아 바로 바뀌어요.

**못 불러오면 가짜 데이터로 때우지 않아요.** 틀린 급식을 보여주는 것보다
"못 불러왔어요, 다시 시도"라고 말하는 게 나으니까요.
