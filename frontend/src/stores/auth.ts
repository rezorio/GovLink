import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { apiRequest } from '@/api/client';
import { useLocaleStore } from '@/stores/locale';
import type { AppRole, AuthUser, LoginResponse } from '@/types';

const TOKEN_KEY = 'govlink_token';

export const useAuthStore = defineStore('auth', () => {
    const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
    const user = ref<AuthUser | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const isAuthenticated = computed(() => Boolean(token.value && user.value));

    const isMunicipal = computed(() =>
        user.value?.roles.some((r) => r === 'MAYOR' || r === 'DEPT_HEAD'),
    );

    const isBarangay = computed(() =>
        user.value?.roles.some((r) => r === 'BARANGAY_CAPTAIN' || r === 'BARANGAY_SECRETARY'),
    );

    function homeRouteForRoles(roles: AppRole[]): string {
        if (roles.some((r) => r === 'MAYOR' || r === 'DEPT_HEAD')) {
            return '/mayor';
        }
        return '/barangay';
    }

    async function login(email: string, password: string) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiRequest<LoginResponse>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            token.value = response.access_token;
            user.value = response.user;
            localStorage.setItem(TOKEN_KEY, response.access_token);
            useLocaleStore().applyDefaultForUser(
                response.user.roles.some((r) => r === 'BARANGAY_CAPTAIN' || r === 'BARANGAY_SECRETARY'),
            );
            return homeRouteForRoles(response.user.roles);
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Login failed';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function fetchProfile() {
        if (!token.value) {
            return;
        }
        user.value = await apiRequest<AuthUser>('/auth/me', {}, token.value);
        if (user.value) {
            useLocaleStore().applyDefaultForUser(
                user.value.roles.some((r) => r === 'BARANGAY_CAPTAIN' || r === 'BARANGAY_SECRETARY'),
            );
        }
    }

    async function hydrate() {
        if (!token.value) {
            return;
        }
        try {
            await fetchProfile();
        } catch {
            logout();
        }
    }

    function logout() {
        token.value = null;
        user.value = null;
        localStorage.removeItem(TOKEN_KEY);
        void import('@/composables/useListCache').then(({ invalidateListCache }) => {
            invalidateListCache();
        });
    }

    return {
        token,
        user,
        loading,
        error,
        isAuthenticated,
        isMunicipal,
        isBarangay,
        login,
        fetchProfile,
        hydrate,
        logout,
        homeRouteForRoles,
    };
});
