import type { Config } from "@jest/types";

const ignoredFiles = ["src/__tests__/utils.ts"];

const config: Config.InitialOptions = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    watchPathIgnorePatterns: ignoredFiles,
    coveragePathIgnorePatterns: ignoredFiles,
    testPathIgnorePatterns: ignoredFiles
};
export default config;