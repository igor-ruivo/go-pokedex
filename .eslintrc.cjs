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
    ],
    settings: {
        react: {
            version: 'detect',
        },
    },
};
