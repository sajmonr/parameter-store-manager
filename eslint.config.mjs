import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['out/**', 'release/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } }
    }
  },
  {
    files: ['src/main/**', 'src/preload/**', '*.config.{js,mjs}'],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['src/renderer/**'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: globals.browser
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules
    }
  },
  {
    files: ['**/*.test.js'],
    languageOptions: { globals: globals.node }
  },
  prettier
];
