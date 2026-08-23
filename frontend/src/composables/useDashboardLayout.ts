import { computed, onMounted, ref } from 'vue';

export type DashboardLayout = 'focused' | 'stacked';

const STORAGE_KEY = 'govlink-dashboard-layout';

const layout = ref<DashboardLayout>('focused');

function readStored(): DashboardLayout {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === 'stacked' ? 'stacked' : 'focused';
    } catch {
        return 'focused';
    }
}

export function useDashboardLayout() {
    onMounted(() => {
        layout.value = readStored();
    });

    const isFocused = computed(() => layout.value === 'focused');

    function setLayout(next: DashboardLayout) {
        layout.value = next;
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* ignore */
        }
    }

    function toggle() {
        setLayout(layout.value === 'focused' ? 'stacked' : 'focused');
    }

    return {
        layout,
        isFocused,
        setLayout,
        toggle,
    };
}

export function initDashboardLayout() {
    layout.value = readStored();
}
