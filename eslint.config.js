import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,

  {
    rules: {
      'no-implicit-globals': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // `x != null` is a deliberate null-and-undefined check, not a slip.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Shared library. quality.js is pure; settings.js and log.js are thin wrappers
  // over storage and console, so the extension globals are in scope here too.
  {
    files: ['src/lib/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.webextensions },
    },
  },

  // MAIN-world agent: shares the page's realm. No chrome.* available there.
  {
    files: ['src/main/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      // YouTube enforces Trusted Types; assigning markup in the page realm throws.
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Trusted Types: never assign innerHTML in the MAIN world.' },
        { property: 'outerHTML', message: 'Trusted Types: never assign outerHTML in the MAIN world.' },
        { property: 'insertAdjacentHTML', message: 'Trusted Types: forbidden in the MAIN world.' },
      ],
    },
  },

  {
    files: ['src/isolated/**/*.js', 'src/popup/**/*.js', 'src/background/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.webextensions },
    },
  },

  {
    files: ['scripts/**/*.mjs', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
];
