import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { fontsource } from 'laravel-vite-plugin/fonts';
import { defineConfig, lazyPlugins } from 'vite-plus';
import zipPack from 'vite-plugin-zip-pack';

export default defineConfig({
    plugins: lazyPlugins(() => [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                fontsource('Inter', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia({ ssr: false }),
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
        wayfinder({
            formVariants: true,
        }),
        zipPack({
            inDir: 'public/build',
            outDir: 'public/build',
        }),
    ]),
    server: {
        watch: {
            ignored: [
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/vendor/**',
            ],
        },
    },
    lint: {
        ignorePatterns: [
            'vendor/**',
            'node_modules/**',
            'public/**',
            'tailwind.config.js',
            'resources/js/actions/**',
            'resources/js/components/ui/*',
            'resources/js/routes/**',
            'resources/js/wayfinder/**',
        ],
        options: {
            denyWarnings: true,
            typeAware: true,
        },
        rules: {
            'unicorn/filename-case': [
                'error',
                {
                    case: 'kebabCase',
                },
            ],
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            message:
                                'Import MUI components from their subpath, for example @mui/material/Button.',
                            regex: '^@mui/[^/]+$',
                        },
                    ],
                },
            ],
        },
    },
    fmt: {
        printWidth: 80,
        tabWidth: 4,
        singleQuote: true,
        semi: true,
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: 'css',
        ignorePatterns: [
            '.ai/**',
            '.github/**',
            'composer.json',
            'resources/js/components/ui/*',
            'resources/views/mail/*',
        ],
    },
});
