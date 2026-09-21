"""
CI 에서 만든 android/app/build.gradle 을 우리 열쇠로 서명하게 고쳐요.

`expo prebuild` 가 만드는 build.gradle 은 release 를 **debug 열쇠**로 서명해요.
그대로 내면 사람마다 다른 열쇠로 서명돼서, 다음 판이 기존 앱 위에 안 깔려요.

로컬에서는 손으로 고쳐뒀지만 CI 는 매번 새로 만들어요. 그래서 여기서 고쳐요.
찾는 자리가 없으면 멈춰요. 조용히 debug 열쇠로 서명되는 것보다 나아요.
"""
import sys

P = 'android/app/build.gradle'
s = open(P, encoding='utf-8').read()

if 'signingConfigs.release' in s:
    print('이미 우리 열쇠로 되어 있어요')
    sys.exit(0)

before = s
s = s.replace(
    'signingConfig signingConfigs.debug\n            shrinkResources',
    'signingConfig signingConfigs.release\n            shrinkResources',
)
if s == before:
    # 모양이 조금 다를 수 있어요. release 블록 안의 첫 debug 서명만 바꿔요.
    i = s.find('release {')
    j = s.find('signingConfig signingConfigs.debug', i)
    if i == -1 or j == -1:
        sys.exit('release 블록의 서명 자리를 못 찾았어요. build.gradle 모양이 바뀌었는지 보세요.')
    s = s[:j] + 'signingConfig signingConfigs.release' + s[j + len('signingConfig signingConfigs.debug'):]

block = """    signingConfigs {
        release {
            storeFile file(NEISCHOOL_STORE_FILE)
            storePassword NEISCHOOL_STORE_PASSWORD
            keyAlias NEISCHOOL_KEY_ALIAS
            keyPassword NEISCHOOL_KEY_PASSWORD
        }
        debug {"""
if '    signingConfigs {\n        debug {' not in s:
    sys.exit('signingConfigs 블록을 못 찾았어요.')
s = s.replace('    signingConfigs {\n        debug {', block)

open(P, 'w', encoding='utf-8').write(s)
print('우리 열쇠로 서명하게 고쳤어요')
