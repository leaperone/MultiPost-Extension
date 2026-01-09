export default {
  extends: 'stylelint-config-standard',
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        // Tailwind v3 directives
        ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen'],
      },
    ],
    // Tailwind v4 uses CSS-first config with new at-rules
    'import-notation': null,
    'at-rule-empty-line-before': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    'value-keyword-case': null,
  },
  overrides: [
    {
      files: ['**/globals.css'],
      rules: {
        'at-rule-no-unknown': [
          true,
          {
            // Tailwind v4 directives
            ignoreAtRules: [
              'tailwind',
              'apply',
              'variants',
              'responsive',
              'screen',
              'plugin',
              'source',
              'custom-variant',
              'theme',
              'config',
            ],
          },
        ],
      },
    },
  ],
};
