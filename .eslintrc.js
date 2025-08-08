module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    // You can add overrides here, or leave empty for defaults
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
