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
            path: '/mayor/sglg',
            name: 'mayor-sglg',
            component: () => import('@/views/MayorSglgView.vue'),
            meta: { municipal: true },
        },
        {
            path: '/mayor/procurement',
            name: 'mayor-procurement',
            component: () => import('@/views/MayorProcurementView.vue'),
            meta: { municipal: true },
        },
        {
            path: '/mayor/plans',
            name: 'mayor-plans',
            component: () => import('@/views/MayorPlansView.vue'),
            meta: { municipal: true },
        },
        {
            path: '/barangay/plans',
            name: 'barangay-plans',
            component: () => import('@/views/BarangayPlansView.vue'),
            meta: { barangay: true },
        },
        {
            path: '/mayor/notifications',
            name: 'mayor-notifications',
            component: () => import('@/views/NotificationsView.vue'),
            meta: { municipal: true },
        },
        {
            path: '/barangay/notifications',
            name: 'barangay-notifications',
            component: () => import('@/views/NotificationsView.vue'),
            meta: { barangay: true },
        },
        {
            path: '/barangay',
            name: 'barangay',
            component: () => import('@/views/BarangayInboxView.vue'),
            meta: { barangay: true },
        },
        {
            path: '/barangay/compliance',
            name: 'barangay-compliance',
            component: () => import('@/views/BarangayComplianceView.vue'),
            meta: { barangay: true },
        },
        {
            path: '/mayor/registry',
            name: 'mayor-registry',
            component: () => import('@/views/MayorRegistryView.vue'),
            meta: { municipal: true },
        },
        {
            path: '/barangay/registry',
            name: 'barangay-registry',
            component: () => import('@/views/BarangayRegistryView.vue'),
            meta: { barangay: true },
        },
        {
            path: '/barangay/procurement',
            name: 'barangay-procurement',
            component: () => import('@/views/BarangayProcurementView.vue'),
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
