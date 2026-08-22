<script setup lang="ts">
import { LogOut } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

defineProps<{
    title: string;
    subtitle?: string;
}>();

const auth = useAuthStore();
const router = useRouter();

function logout() {
    auth.logout();
    router.push({ name: 'login' });
}
</script>

<template>
    <div class="min-h-screen bg-slate-50">
        <header class="border-b border-slate-200 bg-white">
            <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">GovLink</p>
                    <h1 class="text-lg font-bold text-slate-900">{{ title }}</h1>
                    <p v-if="subtitle" class="text-sm text-slate-600">{{ subtitle }}</p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="hidden text-right text-sm sm:block">
                        <p class="font-medium text-slate-900">{{ auth.user?.full_name }}</p>
                        <p class="text-slate-500">{{ auth.user?.email }}</p>
                    </div>
                    <button
                        type="button"
                        class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        aria-label="Sign out"
                        @click="logout"
                    >
                        <LogOut class="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
        <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <slot />
        </main>
    </div>
</template>
