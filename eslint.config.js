import js from '@eslint/js';

export default [
  {
    ignores: ['data/', 'node_modules/', 'coverage/', 'android/', 'ios/']
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly'
      }
    },
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        DeviceMotionEvent: 'readonly',
        URLSearchParams: 'readonly',
        clearTimeout: 'readonly',
        confirm: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly'
      }
    }
  }
];
