module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
		ecmaFeatures: { jsx: true },
		project: './tsconfig.json',
	},
	env: {
		browser: true,
		node: true,
		es6: true,
	},
	plugins: [
		'@typescript-eslint',
		'react',
		'react-hooks',
		'jsx-a11y',
		'promise',
		'simple-import-sort',
		'import',
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended-type-checked',
		'plugin:@typescript-eslint/stylistic-type-checked',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'plugin:jsx-a11y/recommended',
		'plugin:promise/recommended',
		'prettier',
	],
	rules: {
		'no-case-declarations': 'off',
		'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		'simple-import-sort/imports': 'error',
		'simple-import-sort/exports': 'error',
		'@typescript-eslint/array-type': ['error', { default: 'generic' }],
		'@typescript-eslint/consistent-generic-constructors': [
			'error',
			'constructor',
		],
		'@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
		'@typescript-eslint/consistent-type-assertions': [
			'error',
			{
				assertionStyle: 'as',
				objectLiteralTypeAssertions: 'allow-as-parameter',
			},
		],
		'@typescript-eslint/consistent-type-definitions': 'off',
		'@typescript-eslint/consistent-type-exports': [
			'error',
			{
				fixMixedExportsWithInlineTypeSpecifier: true,
			},
		],
		'@typescript-eslint/consistent-type-imports': [
			'error',
			{
				prefer: 'type-imports',
				fixStyle: 'separate-type-imports',
			},
		],
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'@typescript-eslint/no-redundant-type-constituents': 'off',
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ args: 'none', caughtErrorsIgnorePattern: '^ignore' },
		],
		'@typescript-eslint/only-throw-error': 'off',
		'@typescript-eslint/prefer-function-type': 'off',
		'@typescript-eslint/restrict-template-expressions': 'off',
		'@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
		'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
		'import/no-duplicates': 'error',
		'react/react-in-jsx-scope': 'off',
		'no-console': 'warn',
		'jsx-a11y/anchor-is-valid': [
			'error',
			{
				components: ['Link'],
				specialLink: ['hrefLeft', 'hrefRight'],
				aspects: ['invalidHref', 'preferButton'],
			},
		],
	},
	settings: {
		'react': { version: 'detect' },
		'import/resolver': {
			typescript: {},
		},
	},
};
