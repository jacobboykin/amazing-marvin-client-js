import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        typecheck: {
            enabled: true,
            tsconfig: './tsconfig.test.json',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            reportsDirectory: './coverage',
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80
            },
            exclude: [
                'node_modules/',
                'dist/',
                'coverage/',
                'examples/',
                '**/*.test.ts',
                '**/*.spec.ts',
                '**/vitest.config.ts',
                '**/eslint.config.mjs',
                '**/tsconfig.json',
                '**/index.ts'
            ]
        },
        setupFiles: [],
        testTimeout: 10000,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    }
});