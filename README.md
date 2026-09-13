# 학교생활 도우미

서일여자고등학교 학생과 선생님을 위한 학교 정보 앱이에요.
급식, 시간표, 학사일정 달력, 선생님께 질문하는 커뮤니티 네 가지를 담았어요.

- **학생**: 급식 · 시간표 · 달력은 읽기만 하고, 커뮤니티에서만 글을 써요.
- **선생님(관리자)**: 달력에 일정을 추가하고, 쪽지함에서 학생 질문에 답해요.

급식과 시간표는 NEIS 열린 API에서 받아오고, 계정·쪽지·수행평가는 Supabase에 담아요.
`src/data/mock.ts`는 교시 시각표처럼 학교마다 고정인 것만 남아 있어요.

## 팀에서 화면 확인하기 (로그인도 설치도 필요 없어요)

`main`에 푸시하면 GitHub Actions가 웹으로 빌드해서 아래 주소에 올려요.
팀원은 폰이든 노트북이든 이 주소만 열면 돼요.

```
https://eoris1225.github.io/school-app/
```

### 처음 한 번만 해야 하는 설정

1. **Settings › General › Danger Zone › Change visibility** 에서 저장소를 **Public**으로 바꿔요.
   (비공개 저장소는 GitHub Pages가 유료 플랜에서만 돼요)
2. **Settings › Pages › Build and deployment › Source** 를 **GitHub Actions** 로 바꿔요.
3. 이 워크플로가 들어 있는 브랜치를 `main`에 합쳐요. 몇 분 뒤 위 주소가 열려요.

그다음부터는 `main`에 푸시할 때마다 자동으로 새 화면이 올라가요.
다른 브랜치를 보여주고 싶으면 **Actions 탭 › 웹 미리보기 배포 › Run workflow**에서
브랜치를 골라 실행하면 돼요. (이 버튼은 워크플로가 `main`에 있어야 보여요)

### 폰에 앱처럼 깔기 (아이폰도 돼요)

위 주소를 폰 브라우저로 연 다음,

- **아이폰**: 사파리 아래 공유 버튼 › **홈 화면에 추가**
- **안드로이드**: 크롬 메뉴 › **홈 화면에 추가**

하면 홈 화면에 아이콘이 생기고, 누르면 주소창 없이 앱처럼 전체화면으로 떠요.

아이폰은 애플이 서명 안 된 앱 설치를 막아놔서, 안드로이드의 APK처럼 파일로 깔 수가
없어요. TestFlight를 쓰려면 애플 개발자 등록(연 $99)이 필요하고, 무료 계정으로 넣는
방법은 **7일마다 앱이 멈춰요**. 그래서 시험 삼아 써볼 때는 이 방법이 제일 나아요.

이게 되려면 내보낸 화면에 이름·아이콘·색이 적혀 있어야 해요. `public/` 폴더와
`scripts/add-pwa-tags.mjs`가 그 일을 해요. 로컬에서 똑같이 만들려면:

```bash
npm run build:web
```

### 웹으로 볼 때 알아둘 점

화면 구성, 색, 흐름은 실제 앱과 같아요. 다만 아이폰 전용 아이콘(SF Symbols)이
안드로이드용 아이콘으로 대체되고, 햅틱이나 네이티브 키보드 동작은 확인할 수 없어요.
그런 부분은 아래 Expo Go로 봐주세요.

### 아이콘을 바꾸고 싶으면

아이콘은 손으로 그린 게 아니라 `scripts/make-icon.py`가 그려요. 색 몇 줄만 고치고
`python3 scripts/make-icon.py`를 돌리면 앱용·안드로이드용·웹용 여덟 장이 한꺼번에
다시 나와요. (Pillow가 필요해요: `pip install pillow`)

## 내 폰에서 직접 돌려보기 (개발용)

```bash
npm install
npx expo start --tunnel
```

QR을 카메라(iOS)나 Expo Go 앱(Android)으로 찍으면 열려요.

## 글꼴

상황에 따라 두 벌을 나눠 써요.

- **Pretendard** — 한글과 일반 글씨. Regular / Medium / SemiBold / Bold 네 굵기예요.
- **Outfit** — 시각, 날짜, D-day처럼 숫자와 영문만 나오는 자리에 써요.
  숫자가 또렷해지고 화면이 단조롭지 않아요.

화면 코드에서는 `fontWeight`만 적으면 `src/components/text.tsx`가 알맞은 파일을
골라 주고, 숫자 자리에는 `<Text numeric>`을 쓰면 돼요.

용량을 줄이려고 Pretendard는 KS X 1001 완성형 한글 2,350자와 영문·기호만 남겨
줄여서 넣었어요 (2.6MB → 445KB/굵기). 여기에 없는 드문 글자는 폰 기본 글꼴로 나와요.

두 글꼴 모두 SIL Open Font License 1.1이에요. 자세한 안내는
`assets/fonts/LICENSE.md`에 있어요.

## 폴더 구조

```
src/app/            화면 (expo-router 파일 기반 라우팅)
  (tabs)/           홈 · 급식 · 시간표 · 달력 · 커뮤니티
  start.tsx         시작 화면 (나중에 로그인으로 바뀜)
  thread.tsx        쪽지 대화
  profile.tsx       내 정보 · 테마 색 · 화면 밝기
  add-event.tsx     일정 추가 (선생님 전용)
src/components/     공통 UI 조각 (버튼, 카드, 입력칸, 탭 막대)
  text.tsx          굵기와 용도에 맞는 글꼴을 골라 주는 글씨 컴포넌트
src/constants/      테마 색 (accent 하나로 밝은/어두운 팔레트를 자동으로 만들어요)
src/lib/            앱 상태, 시간 계산
src/data/mock.ts    임시 데이터 (NEIS · Supabase로 교체 예정)
```

## 앞으로 할 일

- [ ] NEIS API로 급식 · 시간표 · 학사일정 받아오기
- [ ] Supabase로 쪽지와 일정 저장하기
- [ ] 진짜 로그인 (학생/교사 구분, 교사 초대코드)
- [ ] EAS Build로 APK 만들기
- [ ] 공개 커뮤니티

## 키 관리

API 키는 코드에 절대 쓰지 말고 저장소 시크릿에 넣어요
(GitHub › Settings › Secrets, 또는 Codespaces 시크릿).

앱 코드에서 읽을 수 있는 값은 `EXPO_PUBLIC_` 접두사가 붙은 것뿐이에요.
접두사가 없는 값(`process.env.NEIS_API_KEY` 같은)은 앱 안에서는 `undefined`가 돼요.
그렇다고 `EXPO_PUBLIC_NEIS_API_KEY`로 바꾸면 안 돼요.
**번들에 들어간 값은 앱을 받은 사람 누구나 꺼내 볼 수 있어요.**
NEIS 키처럼 숨겨야 하는 건 앱에서 바로 부르지 말고
Supabase Edge Function 같은 서버를 한 번 거쳐서 부르는 게 안전해요.
