import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results', 'screenshots'] },
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
)
