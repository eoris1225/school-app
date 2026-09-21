# 이 폴더의 글꼴

두 벌 다 **SIL Open Font License 1.1 (OFL)** 이에요. 무료로 쓰고, 앱에
넣어 배포하고, 고쳐 쓸 수 있어요. 글꼴 파일 자체를 따로 팔 수는 없고,
저작권 안내를 함께 둬야 해요. 전문은 같은 폴더의 `OFL.txt` 에 있어요.

## Neischool Sans (본문·제목용)

- 파일: `NeischoolSans.ttf`, `NeischoolSansMedium.ttf`,
  `NeischoolSansSemiBold.ttf`, `NeischoolSansBold.ttf`
- 원본: **Pretendard** — Copyright (c) 2021 Kil Hyung-jin,
  with Reserved Font Name 'Pretendard'
  https://github.com/orioncactus/pretendard
- 라이선스: SIL Open Font License 1.1

앱 용량을 줄이려고 KS X 1001 완성형 한글 2,350자와 영문·기호만 남겨
줄여서(subset) 넣었어요. 여기에 없는 드문 글자는 폰 기본 글꼴로 나와요.

**이름을 왜 바꿨냐면요.** Pretendard 에는 OFL 의 '예약 글꼴 이름
(Reserved Font Name)' 이 걸려 있어요. 글자를 덜어내는 것도 OFL 에서는
수정본(Modified Version)이고, 수정본에는 원래 이름을 쓰면 안 돼요
(OFL 1.1 제3조). 그래서 줄인 판은 `Neischool Sans` 로 부르기로 했어요.
만든 분과 원본 표시는 위에, 그리고 글꼴 파일 안 저작권 칸에 그대로
남아 있어요.

Pretendard 자체도 Source Sans Pro(Adobe, 예약 이름 'Source')와
Inter 를 바탕으로 만들어진 글꼴이에요. 그 표시도 원본 라이선스에
들어 있어요.

## Outfit (숫자·영문 표시용)

- 파일: `Outfit.ttf`(SemiBold), `OutfitBold.ttf`(Bold)
- Copyright 2021 The Outfit Project Authors
  https://github.com/Outfitio/Outfit-Fonts
- 라이선스: SIL Open Font License 1.1

Outfit 에는 예약 글꼴 이름이 없어요. 그래서 이름을 그대로 뒀어요.

## Material Symbols (아이콘)

- 앱에 함께 들어가요. `@expo/vector-icons` 가 가지고 오는 글꼴이라 이
  폴더에는 파일이 없지만, 빌드하면 APK 안에 들어갑니다.
- Copyright Google Inc. — Apache License 2.0
  https://github.com/google/material-design-icons
- 마음대로 쓰고 배포할 수 있어요. 출처만 밝히면 돼요.

## 앱에 들어가는 글꼴 전부 (APK 확인 결과)

| 글꼴 | 라이선스 | 상업적 이용 | 앱에 넣기 |
|---|---|---|---|
| Neischool Sans (Pretendard 줄임) | OFL 1.1 | 가능 | 가능 |
| Outfit | OFL 1.1 | 가능 | 가능 |
| Material Symbols | Apache 2.0 | 가능 | 가능 |

3D 아이콘 그림은 글꼴이 아니라 PNG 예요. `assets/emoji/LICENSE.md` 를
보세요 (Microsoft Fluent Emoji, MIT).
