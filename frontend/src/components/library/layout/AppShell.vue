<script setup lang="ts">
import { LogOut } from 'lucide-vue-next';
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

defineProps<{
    title: string;
    subtitle?: string;
}>();

const auth = useAuthStore();
const router = useRouter();

const navLinks = computed(() => {
    if (auth.isMunicipal) {
        return [
            { to: '/mayor', label: 'Dashboard' },
            { to: '/mayor/sglg', label: 'SGLG' },
            { to: '/mayor/procurement', label: 'Procurement' },
        ];
    }
    if (auth.isBarangay) {
        return [
            { to: '/barangay', label: 'Directives' },
            { to: '/barangay/compliance', label: 'My compliance' },
            { to: '/barangay/procurement', label: 'Procurement' },
        ];
    }
    return [];
});

function logout() {
    auth.logout();
    router.push({ name: 'login' });
}
</script>

<template>
    <div class="gl-shell">
        <header class="border-b border-rule/80 bg-surface/90 backdrop-blur-sm">
            <div class="mx-auto flex max-w-screen-2xl items-end justify-between gap-4 px-4 pb-4 pt-6 sm:px-6 lg:px-8">
                <div class="min-w-0">
                    <p class="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                        GovLink
                    </p>
                    <p class="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                        Municipal supervision
                    </p>
                    <h1 class="mt-4 font-display text-xl font-semibold text-ink sm:text-2xl">
                        {{ title }}
                    </h1>
                    <p v-if="subtitle" class="mt-1 text-sm text-ink-muted">{{ subtitle }}</p>
                    <nav v-if="navLinks.length" class="mt-4 flex flex-wrap gap-5">
                        <RouterLink
                            v-for="link in navLinks"
                            :key="link.to"
                            :to="link.to"
                            class="gl-tab"
                            exact-active-class="gl-tab-active"
                        >
                            {{ link.label }}
                        </RouterLink>
                    </nav>
                </div>
                <div class="flex shrink-0 items-center gap-3 pb-1">
                    <div class="hidden text-right text-sm sm:block">
                        <p class="font-medium text-ink">{{ auth.user?.full_name }}</p>
                        <p class="text-ink-muted">{{ auth.user?.email }}</p>
                    </div>
                    <button
                        type="button"
                        class="inline-flex min-h-11 min-w-11 items-center justify-center border border-rule bg-surface text-ink hover:border-brand hover:bg-brand-soft"
                        style="border-radius: 2px"
                        aria-label="Sign out"
                        @click="logout"
                    >
                        <LogOut class="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
        <main class="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
            <slot />
        </main>
    </div>
</template>
