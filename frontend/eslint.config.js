// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const jsdoc = require('eslint-plugin-jsdoc');

module.exports = defineConfig([
  // The generated API client is not edited by hand.
  { ignores: ['src/app/core/api/generated/**', '.angular/**', 'dist/**'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    plugins: { jsdoc },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      // FR-021 / research R8: user text is shown only through Angular interpolation.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name=/^bypassSecurityTrust/]",
          message: 'bypassSecurityTrust* is forbidden: user text must stay plain text (FR-021).',
        },
      ],
      // Constitution IV: TSDoc on exported classes, functions and services.
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: { ClassDeclaration: true, FunctionDeclaration: true },
          contexts: ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration'],
        },
      ],
    },
  },
  {
    // Tests and config files do not need TSDoc.
    files: ['**/*.spec.ts'],
    rules: { 'jsdoc/require-jsdoc': 'off' },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // FR-021 / research R8: never bind raw HTML.
      'no-restricted-syntax': [
        'error',
        {
          selector: "BoundAttribute[name='innerHTML'], BoundAttribute[name='outerHTML']",
          message: '[innerHTML] and [outerHTML] are forbidden: user text must stay plain text (FR-021).',
        },
      ],
    },
  },
]);
