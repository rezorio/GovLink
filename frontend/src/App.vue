<script setup lang="ts">
import { onErrorCaptured, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import CivicDensityToggle from '@/components/library/feedback/CivicDensityToggle.vue';
import DashboardLayoutToggle from '@/components/library/feedback/DashboardLayoutToggle.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

onMounted(() => {
    auth.hydrate();
});

onErrorCaptured((err) => {
    console.error('App render error:', err);
    if (router.currentRoute.value.name !== 'error') {
        void router.push({
            name: 'error',
            query: {
                message:
                    err instanceof Error
                        ? err.message
                        : 'An unexpected error stopped this page from loading.',
            },
        });
    }
    return false;
});
</script>

<template>
    <RouterView />
    <DashboardLayoutToggle />
    <CivicDensityToggle />
</template>
