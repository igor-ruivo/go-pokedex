#!/usr/bin/env node
const { spawnSync } = require("child_process");

const prettierArgs = [
	"prettier",
	"--write",
	"./src/**/*.ts",
	"./src/**/*.tsx",
	"./src/**/*.scss",
	"./.eslintrc.cjs",
	"./package.json",
	"./prettier.config.cjs",
	"./tsconfig.json",
];

const prettierCommand = `npx ${prettierArgs.join(' ')} 2>&1`;

console.log(prettierCommand);
const prettierResult = spawnSync(prettierCommand, { env: process.env, shell: true, stdio: "inherit" });

if (prettierResult.status === 0) {
	console.log('Done.\n');
} else {
	console.log('Execution failed.\n');
}