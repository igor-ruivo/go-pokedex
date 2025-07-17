#!/usr/bin/env node
const { spawnSync } = require("child_process");

const isWin = process.platform === "win32";
const debugEnv = "DEBUG=eslint:cli-engine";

const eslintArgs = [
	"eslint",
	"--fix",
	"--ext",
	".ts",
	".tsx",
	".scss",
	"./*.ts",
	"./*.tsx",
	"./*.scss",
	"./src",
	"./.eslintrc.cjs",
	"./package.json",
	"./prettier.config.cjs",
	"./tsconfig.json",
];

const cmd = isWin ? "npx" : "env";
const args = isWin
	? ["cross-env", debugEnv, "npx", ...eslintArgs]
	: [debugEnv, "npx", ...eslintArgs];

const lintCommand = `${cmd} ${args.join(' ')} 2>&1`;

console.log(lintCommand);
const lintResult = spawnSync(lintCommand, { env: process.env, shell: true, stdio: "inherit" });

if (lintResult.status === 0) {
	console.log('Done.\n');
} else {
	console.log('Execution failed.\n');
}