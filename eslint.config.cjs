const reactPlugin = require('eslint-plugin-react');
const hooksPlugin = require('eslint-plugin-react-hooks');
const promisePlugin = require('eslint-plugin-promise');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const { config } = require('typescript-eslint');

const {
	generateEslintConfigs,
	getJsConfigs,
	getTsConfigs,
	configureWithPossibleExtension,
} = require('@ti-platform/aide-build-tools');

const baseDir = __dirname;

const configs = generateEslintConfigs({
	baseDir,
	enable: ['html', 'cjs', 'json'],
});

const tsConfigs = configureWithPossibleExtension(getTsConfigs(getJsConfigs(), baseDir), (configs) => {
	return {
		...configs,
		plugins: {
			...configs.plugins,
			promise: promisePlugin,
		},
		rules: {
			...configs.rules,
			...promisePlugin.configs.recommended.rules,
		},
	};
});

if (tsConfigs) {
	const tsxConfigs = {
		...tsConfigs,
		name: 'react-tsx additional ruleset',
		files: ['**/*.tsx'],
		languageOptions: {
			...tsConfigs.languageOptions,
			parserOptions: {
				...tsConfigs.languageOptions?.parserOptions,
				ecmaFeatures: {
					...tsConfigs.languageOptions?.parserOptions?.ecmaFeatures,
					jsx: true,
				},
			},
		},
		plugins: {
			...tsConfigs.plugins,
			'jsx-a11y': jsxA11y,
			'react': reactPlugin,
			'react-hooks': hooksPlugin,
		},
		rules: {
			...tsConfigs.rules,
			...jsxA11y.configs.recommended.rules,
			...reactPlugin.configs.recommended.rules,
			...hooksPlugin.configs.recommended.rules,
			'react/react-in-jsx-scope': 'off',
		},
		settings: {
			...tsConfigs.settings,
			'react': { version: 'detect' },
			'import/resolver': {
				typescript: {},
			},
		},
	};

	const allConfigs = [...config(tsConfigs), ...config(tsxConfigs)];

	configs.push(...allConfigs);
}

module.exports = configs;
