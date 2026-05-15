import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'cli/src/staticAnalysis.js']),
  {
    files: ['cli/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['cli/**/*.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
