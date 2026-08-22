import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', redirect: '/login' },
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/LoginView.vue'),
            meta: { public: true },
        },
        {
            path: '/mayor',
            name: 'mayor',
            component: () => import('@/views/MayorDashboardView.vue'),
            meta: { municipal: true },
        },
        {
            path: '/barangay',
            name: 'barangay',
            component: () => import('@/views/BarangayInboxView.vue'),
            meta: { barangay: true },
        },
    ],
});

router.beforeEach(async (to) => {
    const auth = useAuthStore();
    if (!auth.user && auth.token) {
        await auth.hydrate();
    }

    if (to.meta.public) {
        if (auth.isAuthenticated && to.name === 'login') {
            return auth.homeRouteForRoles(auth.user!.roles);
        }
        return true;
    }

    if (!auth.isAuthenticated) {
        return { name: 'login' };
    }

    if (to.meta.municipal && !auth.isMunicipal) {
        return { name: 'barangay' };
    }

    if (to.meta.barangay && !auth.isBarangay) {
        return { name: 'mayor' };
    }

    return true;
});

export default router;
