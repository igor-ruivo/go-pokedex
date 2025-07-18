const { generatePrettierConfigs } = require('@ti-platform/aide-build-tools');

module.exports = {
	...generatePrettierConfigs(),
	useTabs: true,
	tabWidth: 2,
	jsxSingleQuote: true,
	printWidth: 80,
	bracketSameLine: false,
	proseWrap: 'preserve',
	htmlWhitespaceSensitivity: 'css',
};
