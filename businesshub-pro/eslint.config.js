import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist-electron', 'dist-renderer', 'release', 'node_modules'] },
  js.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': ['error', { selector: "CallExpression[callee.name='eval']", message: 'eval ممنوع' }],
    },
  },
);
