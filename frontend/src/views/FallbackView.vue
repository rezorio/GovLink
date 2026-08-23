<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const props = withDefaults(
    defineProps<{
        kind?: 'not-found' | 'error';
    }>(),
    { kind: 'not-found' },
);

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const isError = computed(() => props.kind === 'error' || route.name === 'error');

const title = computed(() => (isError.value ? 'Something went wrong' : 'Page not found'));
const code = computed(() => (isError.value ? '500' : '404'));
const detail = computed(() => {
    if (isError.value) {
        const msg = typeof route.query.message === 'string' ? route.query.message : null;
        return msg ?? 'An unexpected error stopped this page from loading. You can go back or return home.';
    }
    return 'This address is not part of GovLink. Check the link or return to your workspace.';
});

const homePath = computed(() => {
    if (!auth.isAuthenticated) return '/login';
    return auth.isMunicipal ? '/mayor' : '/barangay';
});

function goHome() {
    router.push(homePath.value);
}

function goBack() {
    if (window.history.length > 1) {
        router.back();
        return;
    }
    goHome();
}
</script>

<template>
    <div class="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div class="absolute inset-0 -z-10 bg-paper" />
        <div
            class="absolute inset-x-0 top-0 -z-10 h-[42vh]"
            style="
                background: linear-gradient(
                    165deg,
                    rgba(15, 107, 92, 0.18) 0%,
                    transparent 70%
                );
            "
        />

        <div class="w-full max-w-lg">
            <p class="font-display text-5xl font-bold tracking-tight text-ink">GovLink</p>
            <p class="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                Republic of the Philippines
            </p>

            <div class="gl-panel mt-8 p-6 sm:p-8">
                <p class="font-display text-4xl font-bold text-ink-muted/40">{{ code }}</p>
                <h1 class="mt-2 font-display text-2xl font-semibold text-ink">{{ title }}</h1>
                <p class="mt-3 text-sm leading-relaxed text-ink-muted">{{ detail }}</p>

                <div class="mt-6 flex flex-wrap gap-3">
                    <button type="button" class="gl-btn-primary" @click="goHome">
                        {{ auth.isAuthenticated ? 'Back to workspace' : 'Sign in' }}
                    </button>
                    <button type="button" class="gl-btn-secondary" @click="goBack">Go back</button>
                </div>
            </div>
        </div>
    </div>
</template>
