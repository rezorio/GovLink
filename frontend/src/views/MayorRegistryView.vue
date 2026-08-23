<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import { fetchBarangays } from '@/api/barangays';
import { fetchResidents } from '@/api/registry';
import { useAuthStore } from '@/stores/auth';
import type { BarangayResident, BarangaySummary } from '@/types';

const auth = useAuthStore();

const barangays = ref<BarangaySummary[]>([]);
const selectedBarangayId = ref('');
const residents = ref<BarangayResident[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

async function loadBarangays() {
    if (!auth.token) {
        return;
    }
    barangays.value = await fetchBarangays(auth.token);
    if (!selectedBarangayId.value && barangays.value.length > 0) {
        selectedBarangayId.value = barangays.value[0].id;
    }
}

async function loadResidents() {
    if (!auth.token || !selectedBarangayId.value) {
        residents.value = [];
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        residents.value = await fetchResidents(auth.token, selectedBarangayId.value);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load registry';
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    try {
        await loadBarangays();
        await loadResidents();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load barangays';
        loading.value = false;
    }
});

watch(selectedBarangayId, loadResidents);
</script>

<template>
    <AppShell title="Registry oversight" subtitle="RA 10173 masked view">
        <p class="mb-6 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Supervisory view — contact fields are masked per RA 10173. Select a barangay to review records.
        </p>

        <label class="mb-5 block max-w-md text-sm">
            <span class="text-ink-muted">Barangay</span>
            <select
                v-model="selectedBarangayId"
                class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                style="border-radius: 2px"
            >
                <option v-for="row in barangays" :key="row.id" :value="row.id">
                    {{ row.name }}
                </option>
            </select>
        </label>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <p v-if="loading" class="text-sm text-ink-muted">Loading registry…</p>

        <div v-else class="gl-panel overflow-hidden">
            <p v-if="residents.length === 0" class="px-4 py-10 text-center text-sm text-ink-muted">
                No registry records for this barangay.
            </p>
            <article
                v-for="row in residents"
                :key="row.id"
                class="gl-ledger-row pl-5"
            >
                <span class="gl-rail gl-rail-warn" aria-hidden="true" />
                <div class="flex flex-wrap items-start justify-between gap-3 sm:col-span-2">
                    <div class="min-w-0">
                        <p class="font-display text-base font-semibold text-ink">{{ row.fullName }}</p>
                        <p class="mt-1 text-xs text-ink-muted">{{ row.recordType }}</p>
                        <p class="mt-2 text-sm text-ink">{{ row.addressLine }}</p>
                        <p class="mt-1 text-sm text-ink-muted">{{ row.phone }}</p>
                    </div>
                    <StatusBadge
                        v-if="row.piiMasked"
                        status="pending"
                        label="PII masked"
                    />
                </div>
            </article>
        </div>
    </AppShell>
</template>
