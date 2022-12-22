module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '16.15.0',
        },
      },
    ],
    ['@babel/preset-typescript'],
  ],
};
