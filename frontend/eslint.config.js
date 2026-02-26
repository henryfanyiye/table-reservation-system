import eslint from '@eslint/js';
import typescriptEslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default [
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommended,
  {
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    ignores: ['dist', 'node_modules', '*.config.js'],
  },
];
