const reactPlugin = require('eslint-plugin-react');
const hooksPlugin = require('eslint-plugin-react-hooks');
const { config } = require('typescript-eslint');

const {
	generateEslintConfigs,
	getJsConfigs,
	getTsConfigs,
} = require('@ti-platform/aide-build-tools');

const baseDir = __dirname;

const configs = generateEslintConfigs({
	baseDir,
	enable: ['html', 'cjs', 'json', 'ts'],
});

const baseTsConfigs = getTsConfigs(getJsConfigs(), baseDir);

if (baseTsConfigs) {
	const tsxConfigWithExtends = {
		...baseTsConfigs,
		name: 'react-tsx additional ruleset',
		files: ['**/*.tsx'],
		plugins: {
			...baseTsConfigs.plugins,
			'react': reactPlugin,
			'react-hooks': hooksPlugin,
		},
		rules: {
			...baseTsConfigs.rules,
			...reactPlugin.configs.recommended.rules,
			...hooksPlugin.configs.recommended.rules,
			'react/react-in-jsx-scope': 'off',
		},
		settings: {
			'react': { version: 'detect' },
			'import/resolver': {
				typescript: {},
			},
		},
	};

	configs.push(...config(tsxConfigWithExtends));
}

module.exports = configs;
