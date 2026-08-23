import { computed } from 'vue';
import { assignmentStatusLabel, complianceStatusLabel, translate } from '@/i18n';
import { useLocaleStore } from '@/stores/locale';

export function useI18n() {
    const localeStore = useLocaleStore();

    const locale = computed(() => localeStore.current);

    function t(key: string, params?: Record<string, string | number>) {
        return translate(localeStore.current, key, params);
    }

    function assignmentStatus(status: string) {
        return assignmentStatusLabel(localeStore.current, status);
    }

    function complianceStatus(status: string) {
        return complianceStatusLabel(localeStore.current, status);
    }

    return {
        locale,
        t,
        assignmentStatus,
        complianceStatus,
        setLocale: localeStore.setLocale,
    };
}
