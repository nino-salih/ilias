/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  testMatch: ['**/test/**/*.test.ts'],
  coverageDirectory: './coverage',
  moduleDirectories: ["node_modules", "src"],
  coveragePathIgnorePatterns: ['node_modules', 'src/database', 'src/test', 'src/types', 'test/'],
  reporters: ['default', 'jest-junit'],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

};