import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  modulePaths: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    // if you have path aliases in tsconfig, mirror them here
    // '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  setupFilesAfterEnv: [],
  testMatch: ['**/*.test.ts'],
  // speeds up ts-jest
  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};
export default config;
