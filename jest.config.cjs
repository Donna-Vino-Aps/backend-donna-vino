module.exports = {
  transform: {
    "^.+\\.m?js$": "babel-jest",
  },
  modulePathIgnorePatterns: ["__testUtils__"],
  transformIgnorePatterns: ["/node_modules/"],
  setupFilesAfterEnv: ["./jest.setup.js"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$",
  moduleFileExtensions: ["js", "jsx", "mjs"],
};
