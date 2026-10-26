import { importX } from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'

// Import rules only (no other rule sets). Check-only: run `npm run lint`, fix by hand.
export default [
    { ignores: ['dist'] },
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tseslint.parser,
        },
        plugins: {
            'import-x': importX,
        },
        rules: {
            'import-x/order': ['error', {
                // External packages, then ../ modules, then ./ siblings, with a blank line between groups
                groups: ['builtin', 'external', 'parent', 'sibling', 'index'],
                'newlines-between': 'always',
                // react first among externals, CSS modules last among siblings (no extra blank lines)
                pathGroups: [
                    { pattern: 'react', group: 'external', position: 'before' },
                    { pattern: './*.module.css', group: 'sibling', position: 'after' },
                ],
                pathGroupsExcludedImportTypes: ['builtin'],
                distinctGroup: false,
            }],
            'import-x/first': 'error',
            'import-x/newline-after-import': 'error',
            'import-x/no-duplicates': 'error',
        },
    },
]
