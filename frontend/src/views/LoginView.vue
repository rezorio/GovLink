<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const email = ref('mayor@san-jose-batangas.gov.ph');
const password = ref('GovLinkDemo1!');

async function onSubmit() {
    try {
        const route = await auth.login(email.value.trim(), password.value);
        router.push(route);
    } catch {
        // error shown via store
    }
}
</script>

<template>
    <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="mb-6 text-center">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Republic of the Philippines</p>
                <h1 class="mt-1 text-2xl font-bold text-slate-900">GovLink</h1>
                <p class="mt-1 text-sm text-slate-600">Municipal–Barangay supervision portal</p>
            </div>

            <form class="space-y-4" @submit.prevent="onSubmit">
                <div>
                    <label for="email" class="mb-1 block text-sm font-medium text-slate-700">Email</label>
                    <input
                        id="email"
                        v-model="email"
                        type="email"
                        required
                        autocomplete="username"
                        class="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                </div>
                <div>
                    <label for="password" class="mb-1 block text-sm font-medium text-slate-700">Password</label>
                    <input
                        id="password"
                        v-model="password"
                        type="password"
                        required
                        autocomplete="current-password"
                        class="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                </div>

                <p v-if="auth.error" class="text-sm text-rose-600">{{ auth.error }}</p>

                <button
                    type="submit"
                    class="min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    :disabled="auth.loading"
                >
                    {{ auth.loading ? 'Signing in…' : 'Sign in' }}
                </button>
            </form>

            <div class="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <p class="font-semibold text-slate-800">Demo accounts</p>
                <p>Mayor: mayor@san-jose-batangas.gov.ph</p>
                <p>Punong Barangay: captain@aguila-sj-batangas.gov.ph</p>
                <p>Password: GovLinkDemo1!</p>
            </div>
        </div>
    </div>
</template>
