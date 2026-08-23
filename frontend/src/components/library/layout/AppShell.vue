<script setup lang="ts">
import { Bell, LogOut } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { fetchUnreadCount } from '@/api/notifications';
import { useI18n } from '@/composables/useI18n';
import { useAuthStore } from '@/stores/auth';
import type { Locale } from '@/i18n/types';

defineProps<{
    title: string;
    subtitle?: string;
}>();

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { t, locale, setLocale } = useI18n();

const unreadCount = ref(0);

const notificationsPath = computed(() =>
    auth.isMunicipal ? '/mayor/notifications' : '/barangay/notifications',
);

const navLinks = computed(() => {
    if (auth.isMunicipal) {
        return [
            { to: '/mayor', label: t('nav.dashboard') },
            { to: '/mayor/sglg', label: t('nav.sglg') },
            { to: '/mayor/procurement', label: t('nav.procurement') },
            { to: '/mayor/registry', label: t('nav.registry') },
        ];
    }
    if (auth.isBarangay) {
        return [
            { to: '/barangay', label: t('nav.directives') },
            { to: '/barangay/compliance', label: t('nav.myCompliance') },
            { to: '/barangay/procurement', label: t('nav.procurement') },
            { to: '/barangay/registry', label: t('nav.registry') },
        ];
    }
    return [];
});

async function refreshUnread() {
    if (!auth.token) {
        unreadCount.value = 0;
        return;
    }
    try {
        const result = await fetchUnreadCount(auth.token);
        unreadCount.value = result.count;
    } catch {
        unreadCount.value = 0;
    }
}

function logout() {
    auth.logout();
    router.push({ name: 'login' });
}

function pickLocale(next: Locale) {
    setLocale(next);
}

onMounted(refreshUnread);
watch(
    () => route.fullPath,
    () => {
        void refreshUnread();
    },
);
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
                        {{ t('shell.municipalSupervision') }}
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
                    <div
                        v-if="auth.isBarangay"
                        class="hidden items-center gap-1 rounded-sm border border-rule bg-surface p-0.5 sm:flex"
                        role="group"
                        :aria-label="t('shell.language')"
                    >
                        <button
                            type="button"
                            class="min-h-9 px-2.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                            :class="locale === 'en' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'"
                            @click="pickLocale('en')"
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            class="min-h-9 px-2.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                            :class="locale === 'tl' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'"
                            @click="pickLocale('tl')"
                        >
                            FIL
                        </button>
                    </div>
                    <div class="hidden text-right text-sm sm:block">
                        <p class="font-medium text-ink">{{ auth.user?.full_name }}</p>
                        <p class="text-ink-muted">{{ auth.user?.email }}</p>
                    </div>
                    <RouterLink
                        :to="notificationsPath"
                        class="relative inline-flex min-h-11 min-w-11 items-center justify-center border border-rule bg-surface text-ink hover:border-brand hover:bg-brand-soft"
                        style="border-radius: 2px"
                        :aria-label="t('nav.notifications')"
                    >
                        <Bell class="h-5 w-5" />
                        <span
                            v-if="unreadCount > 0"
                            class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-status-warn px-1 text-[10px] font-bold text-ink"
                            style="border-radius: 2px"
                        >
                            {{ unreadCount > 99 ? '99+' : unreadCount }}
                        </span>
                    </RouterLink>
                    <button
                        type="button"
                        class="inline-flex min-h-11 min-w-11 items-center justify-center border border-rule bg-surface text-ink hover:border-brand hover:bg-brand-soft"
                        style="border-radius: 2px"
                        :aria-label="t('shell.signOut')"
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
