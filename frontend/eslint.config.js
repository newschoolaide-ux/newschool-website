// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
    rules: {
      'react/no-unstable-nested-components': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
