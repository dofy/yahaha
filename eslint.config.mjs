import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import astro from 'eslint-plugin-astro'
import a11y from 'eslint-plugin-jsx-a11y-x'
import globals from 'globals'

export default [
  { ignores: ['dist/**', '.astro/**', 'node_modules/**', '.wrangler/**'] },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: globals.node }
  },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-recommended'],
  {
    ...a11y.configs.recommended,
    files: ['src/**/*.tsx'],
    languageOptions: {
      ...a11y.configs.recommended.languageOptions,
      globals: globals.browser
    }
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
      globals: globals.browser
    }
  }
]
