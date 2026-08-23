import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Locale } from '@/i18n/types';

const LOCALE_KEY = 'govlink_locale';

function readStoredLocale(): Locale | null {
    const stored = localStorage.getItem(LOCALE_KEY);
    return stored === 'en' || stored === 'tl' ? stored : null;
}

export const useLocaleStore = defineStore('locale', () => {
    const current = ref<Locale>(readStoredLocale() ?? 'en');

    const isTagalog = computed(() => current.value === 'tl');

    function setLocale(locale: Locale) {
        current.value = locale;
        localStorage.setItem(LOCALE_KEY, locale);
    }

    /** Default Filipino for barangay field users when no preference is saved yet. */
    function applyDefaultForUser(isBarangay: boolean) {
        if (!readStoredLocale()) {
            setLocale(isBarangay ? 'tl' : 'en');
        }
    }

    function clearOnLogout() {
        // Keep explicit language choice across sessions.
    }

    return {
        current,
        isTagalog,
        setLocale,
        applyDefaultForUser,
        clearOnLogout,
    };
});
