/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{vue,js,ts}'],
    theme: {
        extend: {
            colors: {
                paper: 'var(--paper)',
                surface: 'var(--surface)',
                ink: {
                    DEFAULT: 'var(--ink)',
                    muted: 'var(--ink-muted)',
                },
                rule: 'var(--rule)',
                brand: {
                    DEFAULT: 'var(--brand)',
                    soft: 'var(--brand-soft)',
                },
                status: {
                    ok: 'var(--ok)',
                    warn: 'var(--warn)',
                    danger: 'var(--danger)',
                },
            },
            fontFamily: {
                display: ['var(--font-display)'],
                sans: ['var(--font-sans)'],
            },
        },
    },
    plugins: [],
};
