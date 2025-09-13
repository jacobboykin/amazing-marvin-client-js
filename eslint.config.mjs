import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist/**", "coverage/**", "vitest.config.ts", "examples/**", "**/*.test.ts", "**/*.spec.ts"] },
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    // Base rules for source files only
    {
        files: ["src/**/*.ts"],
        ignores: ["**/*.test.ts", "**/*.spec.ts"],
        languageOptions: { 
            parserOptions: { 
                project: true, 
                tsconfigRootDir: import.meta.dirname 
            } 
        },
        rules: {
            // Library-specific rules
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/prefer-readonly': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
        },
    },
    // Simple rules for test files (no type checking)
    {
        files: ["**/*.test.ts", "**/*.spec.ts"],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
        ],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    // Relaxed rules for examples
    {
        files: ["examples/**/*.ts"],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
        ],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-console': 'off',
        },
    }
);
