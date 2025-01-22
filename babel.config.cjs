module.exports = {
  presets: [["@babel/preset-env", { targets: "node 16", modules: "auto" }]],
  plugins: ["@babel/plugin-transform-runtime"],
  sourceType: "module",
};
