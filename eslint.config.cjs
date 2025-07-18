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
	enable: ['html', 'cjs', 'json', 'ts'],
});

const baseTsConfigs = configureWithPossibleExtension(
	getTsConfigs(getJsConfigs(), baseDir),
	(configs) => {
		return {
			...configs,
			plugins: {
				...configs.plugins,
				'promise': promisePlugin,
				'jsx-a11y': jsxA11y,
			},
			rules: {
				...configs.rules,
				...promisePlugin.configs.recommended.rules,
				...jsxA11y.configs.recommended.rules,
			},
		};
	}
);

if (baseTsConfigs) {
	const tsxConfigWithExtends = {
		...baseTsConfigs,
		name: 'react-tsx additional ruleset',
		files: ['**/*.tsx'],
		languageOptions: {
			...baseTsConfigs.languageOptions,
			parserOptions: {
				...baseTsConfigs.languageOptions?.parserOptions,
				ecmaFeatures: {
					...baseTsConfigs.languageOptions?.parserOptions?.ecmaFeatures,
					jsx: true,
				},
			},
		},
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
			...baseTsConfigs.settings,
			'react': { version: 'detect' },
			'import/resolver': {
				typescript: {},
			},
		},
	};

	configs.push(...config(tsxConfigWithExtends));
}

module.exports = configs;
