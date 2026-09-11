// https://docs.expo.dev/guides/using-eslint/
//
// `npx expo lint` 로 돌려요. 타입 검사(tsc)와 별개예요.
// supabase/ 와 scripts/ 는 Deno에서 돌아가니 `deno lint` 로 따로 봐요.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/*', 'scripts/check-subjects.ts'],
  },
]);
