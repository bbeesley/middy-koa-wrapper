module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'airbnb-typescript/base',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  plugins: ['jest'],
  settings: {
    'import/resolver': {
      typescript: true,
      node: true
    },
    'import/ignore': ['koa', 'aws-lambda'],
  },
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.test.json'],
    tsconfigRootDir: __dirname,
  },
  rules: {
    'no-undef': 'error',
    '@typescript-eslint/indent': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'import/no-extraneous-dependencies': 'off',
  },
  overrides: [
    {
      files: '**/*.test.*',
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
  env: {
    'jest/globals': true,
    es6: true,
    node: true,
  },
};
