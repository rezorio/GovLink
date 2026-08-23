import { computed, onMounted, ref } from 'vue';

export type CivicDensity = 'alive' | 'classic';

const STORAGE_KEY = 'govlink-civic-density';

const density = ref<CivicDensity>('alive');

function readStored(): CivicDensity {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === 'classic' ? 'classic' : 'alive';
    } catch {
        return 'alive';
    }
}

function applyToDocument(next: CivicDensity) {
    document.documentElement.setAttribute('data-civic-density', next);
}

export function useCivicDensity() {
    onMounted(() => {
        density.value = readStored();
        applyToDocument(density.value);
    });

    const isAlive = computed(() => density.value === 'alive');

    function setDensity(next: CivicDensity) {
        density.value = next;
        applyToDocument(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* ignore quota / private mode */
        }
    }

    function toggle() {
        setDensity(density.value === 'alive' ? 'classic' : 'alive');
    }

    return {
        density,
        isAlive,
        setDensity,
        toggle,
    };
}

/** Call once at app boot (before mount) to avoid a classic→alive flash. */
export function initCivicDensity() {
    const next = readStored();
    density.value = next;
    applyToDocument(next);
}
