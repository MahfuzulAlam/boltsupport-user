import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'public/mockServiceWorker.js'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      /* PRD 10.3: strict means strict. These three are the escape hatches the spec names,
         so they are errors rather than warnings. */
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',

      /* NFR-2.2: untrusted HTML renders only through the sandboxed iframe component, which
         uses srcDoc. Nothing in this codebase needs dangerouslySetInnerHTML, so there is no
         allowlisted exception. Enforcing it here means it cannot creep in during review. */
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            'Untrusted HTML renders only through EmailIframeRenderer (DOMPurify + sandboxed iframe). See NFR-2.1 and NFR-2.2.',
        },
        {
          selector:
            "CallExpression[callee.object.name='localStorage'][callee.property.name='setItem'][arguments.0.value=/token|auth|session|jwt/i]",
          message: 'Auth tokens never go in localStorage. Assume httpOnly cookies. See NFR-2.5.',
        },
      ],

      /* Architecture contract: cross feature imports go through the public barrel only, and
         nothing uses deep relative paths. */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: 'Use the @/ path alias instead of deep relative imports.',
            },
            {
              group: ['@/features/*/*'],
              message:
                "Import another feature only through its index.ts barrel, for example @/features/inbox. Reaching into a feature's internals is forbidden.",
            },
            {
              group: ['@/mocks', '@/mocks/*'],
              message:
                'Application code must not import the mock layer. Doing so pulls the whole seed dataset into the production bundle. Only src/mocks and tests may import it.',
            },
          ],
        },
      ],
    },
  },
  /* A feature's own files legitimately reach their siblings, so only the cross feature barrel
     pattern is relaxed here. The mock layer ban still applies: a component importing seed data
     is how the whole fixture set ends up in the production bundle. */
  {
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: 'Use the @/ path alias instead of deep relative imports.',
            },
            {
              group: ['@/mocks', '@/mocks/*'],
              message:
                'Application code must not import the mock layer. Doing so pulls the whole seed dataset into the production bundle. Only src/mocks, src/main.tsx, and tests may import it.',
            },
          ],
        },
      ],
    },
  },
  /* The router names one page module per route on purpose.
     Going through a barrel would defeat the split it is asking for: a barrel that also exports
     hooks another feature imports becomes shared, and a shared module is hoisted into the entry
     chunk along with everything it pulls in. Naming the module keeps each route's weight on
     that route. Page components are used nowhere else, so nothing else needs this. */
  {
    files: ['src/app/router.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: 'Use the @/ path alias instead of deep relative imports.',
            },
            {
              group: ['@/features/*/hooks/*', '@/features/*/api/*'],
              message:
                "The router may name a page component module, but a feature's hooks and api layer are still private. Import those through the barrel.",
            },
            {
              group: ['@/mocks', '@/mocks/*'],
              message: 'Application code must not import the mock layer. See NFR-2.6.',
            },
          ],
        },
      ],
    },
  },
  /* The bootstrap starts the worker, the mock layer imports itself, and tests need fixtures. */
  {
    files: ['src/main.tsx', 'src/mocks/**', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  /* Generated by the shadcn CLI. They export cva variants beside the component, which trips the
     fast refresh rule; regenerating them would just reintroduce it. */
  {
    files: ['src/components/ui/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  /* The auth pages autofocus their first field, which the design specification asks for.
     jsx-a11y warns about autofocus because it disorients when it fires partway down a busy
     page; these are single purpose screens whose only action is the form, so focus landing
     there is what a keyboard or screen reader user wants. Scoped rather than disabled inline
     so it cannot spread to the app itself. */
  {
    files: ['src/features/auth/**'],
    rules: { 'jsx-a11y/no-autofocus': 'off' },
  },
  {
    files: ['*.config.{ts,js}', 'src/test/**'],
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-unsafe-assignment': 'off' },
  },
)
