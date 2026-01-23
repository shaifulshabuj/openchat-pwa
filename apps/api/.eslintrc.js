module.exports = {
  env: {
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off', // Allow console statements in development
    'no-extra-semi': 'error', // Keep this as error since it's easily fixable
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.js',
    '.eslintrc.js',
  ],
}