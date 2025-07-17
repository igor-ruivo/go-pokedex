const { generateEslintConfigs } = require('@ti-platform/aide-build-tools');

module.exports = {
    ...generateEslintConfigs({
        baseDir: __dirname,
        enable: ['cjs', 'json', 'ts'],
    }),
    overrides: [
        {
            files: ['**/*.tsx'],
            parser: '@typescript-eslint/parser',
            extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
            rules: {
                'react/react-in-jsx-scope': 'off',
            },
        },
        {
            files: ['*.cjs'],
            parser: require.resolve('espree'),
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'script',
            },
            env: {
                node: true,
                commonjs: true,
            },
        },
        {
            files: ['*.json'],
            extends: ['plugin:json/recommended'],
            plugins: ['json'],
        },
    ],
    settings: {
        react: {
            version: 'detect',
        },
    },
};
