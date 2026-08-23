<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import GovLinkLogo from '@/components/library/layout/GovLinkLogo.vue';

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
    <div class="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div class="absolute inset-0 -z-10 bg-paper" />
        <div
            class="absolute inset-x-0 top-0 -z-10 h-[48vh]"
            style="
                background: linear-gradient(
                    165deg,
                    color-mix(in srgb, var(--brand) 28%, transparent) 0%,
                    color-mix(in srgb, var(--seal) 10%, transparent) 38%,
                    transparent 72%
                );
            "
        />
        <div
            class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1"
            style="
                background: linear-gradient(90deg, var(--seal), var(--brand), transparent 70%);
            "
        />

        <div class="w-full max-w-md">
            <div class="mb-8">
                <GovLinkLogo size="lg" />
                <p class="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                    Republic of the Philippines
                </p>
                <p class="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
                    Municipal–Barangay supervision portal for auditable directives and compliance.
                </p>
            </div>

            <form class="gl-panel space-y-4 p-6" @submit.prevent="onSubmit">
                <div>
                    <label for="email" class="mb-1 block text-sm font-medium text-ink">Email</label>
                    <input
                        id="email"
                        v-model="email"
                        type="email"
                        required
                        autocomplete="username"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        style="border-radius: 2px"
                    />
                </div>
                <div>
                    <label for="password" class="mb-1 block text-sm font-medium text-ink">Password</label>
                    <input
                        id="password"
                        v-model="password"
                        type="password"
                        required
                        autocomplete="current-password"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        style="border-radius: 2px"
                    />
                </div>

                <p v-if="auth.error" class="text-sm text-status-danger">{{ auth.error }}</p>

                <button type="submit" class="gl-btn-primary w-full disabled:opacity-50" :disabled="auth.loading">
                    {{ auth.loading ? 'Signing in…' : 'Sign in' }}
                </button>
            </form>

            <div class="mt-5 border-l-2 border-brand/40 pl-3 text-xs leading-relaxed text-ink-muted">
                <p class="font-semibold text-ink">Demo accounts</p>
                <p>Mayor: mayor@san-jose-batangas.gov.ph</p>
                <p>Punong Barangay: captain@aguila-sj-batangas.gov.ph</p>
                <p>Password: GovLinkDemo1!</p>
            </div>
        </div>
    </div>
</template>
