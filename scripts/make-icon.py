"""
앱 아이콘을 만들어요.  python3 scripts/make-icon.py

손으로 그린 그림 대신 코드로 그리는 이유가 있어요. 테마 색을 바꾸면
아이콘도 같이 바꿔야 하는데, 그때 이 파일의 색 몇 줄만 고치면 여덟 장이
한꺼번에 다시 나와요. 손으로 그리면 여덟 장을 다 다시 그려야 해요.

그림은 '시간표 한 장'이에요. 이 앱에서 제일 자주 보는 화면이고, 과목마다
색이 다른 게 우리 앱의 눈에 띄는 점이거든요. 가운데 주황 칸 하나는
'지금 수업'이에요. 홈 화면이 제일 먼저 알려주는 것과 같아요.

색은 constants/themes.ts 가 기본 테마(#D97757)로 만들어낸 값을 그대로
적어둔 거예요. 테마 색을 바꾸면 아래 표도 같이 고쳐주세요.
"""
from PIL import Image, ImageDraw

OUT_APP = 'assets/images'
OUT_WEB = 'public'
SS = 4  # 4배로 그린 뒤 줄여서 가장자리를 매끈하게 만들어요

BAND      = (226, 153, 129)  # #E29981  띠 위쪽
BAND_DEEP = (212, 103,  67)  # #D46743  띠 아래쪽
ACCENT    = (217, 119,  87)  # #D97757  기본 테마 색
ON_ACCENT = ( 37,  19,  14)  # #25130E  그 위에 올리는 글씨색
SURFACE   = (254, 254, 254)  # #FEFEFE  카드 바탕

# 과목 색이에요. tones.ts 에서 가져왔어요. (연한 바탕, 진한 글씨)
TONES = [
    ((233, 239, 248), ( 58,  98, 143)),  # 수학
    ((250, 236, 239), (164,  80, 106)),  # 국어
    ((238, 235, 248), ( 91,  76, 147)),  # 영어
    ((228, 240, 239), ( 44, 106, 104)),  # 과학
    ((231, 241, 231), ( 58, 107,  69)),  # 체육
    ((249, 234, 242), (154,  75, 123)),  # 음악
    ((249, 235, 225), (149,  89,  47)),  # 역사
]

# 칸 배치. None은 빈 칸이에요. 빈 칸이 있어야 표로 읽혀요.
# 꽉 채우면 그냥 무늬처럼 보여요.
PLAN = [
    [0, 1, None],
    [3, None, 2],
    [6, 'now', 4],
    [None, 5, 0],
]


def ground(size):
    """홈 화면 띠와 같은 방향으로 색이 내려가는 바탕이에요."""
    g = Image.new('RGB', (1, size))
    for y in range(size):
        t = y / (size - 1)
        g.putpixel((0, y), tuple(round(BAND[i] + (BAND_DEEP[i] - BAND[i]) * t) for i in range(3)))
    return g.resize((size, size)).convert('RGBA')


def timetable(size, span, mono=False):
    """시간표 카드를 그려요. span은 카드가 화면에서 차지하는 비율이에요."""
    lay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    side = size * span
    p = (size - side) / 2
    d.rounded_rectangle([p, p, p + side, p + side], radius=side * 0.145,
                        fill=(255, 255, 255, 255) if mono else SURFACE + (255,))

    ip = side * 0.085
    gw = side - ip * 2
    rows, cols = len(PLAN), len(PLAN[0])
    gap = gw * 0.055
    cw = (gw - gap * (cols - 1)) / cols
    ch = (gw - gap * (rows - 1)) / rows

    for r, row in enumerate(PLAN):
        for c, v in enumerate(row):
            if v is None:
                continue
            x = p + ip + c * (cw + gap)
            y = p + ip + r * (ch + gap)
            box = [x, y, x + cw, y + ch]
            if mono:
                # 한 가지 색으로만 칠해지는 아이콘이에요. 색으로 구분할 수 없으니
                # 칸을 뚫어서 모양으로 보이게 해요.
                d.rounded_rectangle(box, radius=cw * 0.24, fill=(0, 0, 0, 0))
                continue
            bg, fg = (ACCENT, ON_ACCENT) if v == 'now' else TONES[v]
            d.rounded_rectangle(box, radius=cw * 0.24, fill=bg + (255,))
            bx, by, bh = cw * 0.15, ch * 0.415, ch * 0.17
            d.rounded_rectangle([x + bx, y + by, x + cw - bx, y + by + bh],
                                radius=bh / 2, fill=fg + (255,))
    return lay


def icon(size, span=0.77, bg=True, mono=False, rounded=None, rgb=False):
    big = size * SS
    base = ground(big) if bg else Image.new('RGBA', (big, big), (0, 0, 0, 0))
    im = Image.alpha_composite(base, timetable(big, span, mono))
    if rounded:
        # 모서리를 둥글게 잘라요. 폰이 알아서 안 잘라주는 자리에 써요.
        mask = Image.new('L', (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, big, big], radius=big * rounded, fill=255)
        im.putalpha(mask)
    im = im.resize((size, size), Image.LANCZOS)
    return im.convert('RGB') if rgb else im


def save(im, path):
    im.save(path)
    print('  ', path, im.size)


print('앱 아이콘')
save(icon(1024), f'{OUT_APP}/icon.png')
# 안드로이드는 배경과 앞면을 따로 받아서 기기마다 다른 모양으로 잘라요.
# 앞면은 가운데 3분의 2 안에 들어와야 잘려도 멀쩡해요.
save(icon(512, span=0.60, bg=False), f'{OUT_APP}/android-icon-foreground.png')
save(ground(512 * SS).resize((512, 512), Image.LANCZOS), f'{OUT_APP}/android-icon-background.png')
save(icon(512, span=0.60, bg=False, mono=True), f'{OUT_APP}/android-icon-monochrome.png')
# 켤 때 잠깐 보이는 그림. 앱 아이콘 모양 그대로 둥글게 잘라서 써요.
save(icon(512, rounded=0.22), f'{OUT_APP}/splash-icon.png')
save(icon(48), f'{OUT_APP}/favicon.png')

print('홈 화면에 추가했을 때 쓰는 것')
save(icon(192), f'{OUT_WEB}/icon-192.png')
save(icon(512), f'{OUT_WEB}/icon-512.png')
# 안드로이드가 동그랗게 자를 수 있어서 안쪽에 더 여유를 둔 것도 하나 만들어요.
save(icon(512, span=0.60), f'{OUT_WEB}/icon-maskable-512.png')
# 아이폰은 투명한 자리를 검게 칠해요. 그래서 투명 없이 내보내요.
save(icon(180, rgb=True), f'{OUT_WEB}/apple-touch-icon.png')
