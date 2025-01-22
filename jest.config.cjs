module.exports = {
  transform: {
    "^.+\\.m?js$": "babel-jest",
  },
  modulePathIgnorePatterns: ["__testUtils__"],
  transformIgnorePatterns: ["/node_modules/(?!express|ipaddr.js)/"],
  setupFilesAfterEnv: ["./jest.setup.js"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^express$": "<rootDir>/node_modules/express",
    "^ipaddr.js$": "<rootDir>/node_modules/ipaddr.js",
    "^cookie-parser$": "<rootDir>/node_modules/cookie-parser",
    "^dotenv$": "<rootDir>/node_modules/dotenv",
    "^cors$": "<rootDir>/node_modules/cors",
    "^src/(.*)$": "<rootDir>/src/$1",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$",
  moduleFileExtensions: ["js", "jsx", "mjs"],
};
