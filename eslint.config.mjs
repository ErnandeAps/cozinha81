import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:lib'],
            },
            {
              sourceTag: 'type:lib',
              onlyDependOnLibsWithTags: ['type:lib'],
            },
            {
              sourceTag: 'scope:data-access',
              onlyDependOnLibsWithTags: ['scope:domain-models'],
            },
            {
              sourceTag: 'scope:design-system',
              onlyDependOnLibsWithTags: [],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['backend/src/modules/gestao-cozinha/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../pedidos/**',
                '**/modules/pedidos/**',
                '../backoffice/**',
                '**/modules/backoffice/**',
              ],
              message: 'gestao-cozinha module cannot import from pedidos or backoffice modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['backend/src/modules/pedidos/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../gestao-cozinha/**',
                '**/modules/gestao-cozinha/**',
                '../backoffice/**',
                '**/modules/backoffice/**',
              ],
              message: 'pedidos module cannot import from gestao-cozinha or backoffice modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['backend/src/modules/backoffice/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../gestao-cozinha/**',
                '**/modules/gestao-cozinha/**',
                '../pedidos/**',
                '**/modules/pedidos/**',
              ],
              message: 'backoffice module cannot import from gestao-cozinha or pedidos modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
