module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Jest runs on Node, which already supplies Intl.PluralRules. The package is ESM-only
    // and Expo consumes it normally; map only these test-time side-effect imports.
    "^@formatjs/intl-pluralrules/(polyfill-force|locale-data/(en|de|es|fr))$":
      "<rootDir>/src/test/intlPluralRulesMock.js",
  },
};
