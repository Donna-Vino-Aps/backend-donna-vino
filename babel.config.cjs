module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: "current",
      },
    ],
  ],
  plugins: ["@babel/plugin-transform-runtime"],
};
