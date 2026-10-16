import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['out/**', 'release/**', 'node_modules/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/consistent-type-imports': 'error'
    }
  },
  {
    files: ['src/main/**', 'src/preload/**', '*.config.{js,mjs,ts}'],
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
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      // TypeScript checks props.
      'react/prop-types': 'off'
    }
  },
  // Contracts in src/main are bundled into the renderer too, so the renderer
  // may import only those from main, and contracts may import only what is
  // safe in the renderer: zod, src/shared and other contracts. Type imports
  // are erased, so they're allowed.
  {
    files: ['src/renderer/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '/main/(?!.*\\.contract$)',
              message:
                'The renderer may import only *.contract files from src/main.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/main/**/*.contract.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!zod$|.*\\.contract$|(\\.\\./)+shared/)',
              allowTypeImports: true,
              message:
                'Contracts are bundled into the renderer: import only zod, src/shared and other contracts.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}'],
    languageOptions: { globals: globals.node }
  },
  prettier
);
