<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import { createResident, fetchResidents } from '@/api/registry';
import { useI18n } from '@/composables/useI18n';
import { useAuthStore } from '@/stores/auth';
import type { BarangayResident, ResidentRecordType } from '@/types';

const auth = useAuthStore();
const { t } = useI18n();

const residents = ref<BarangayResident[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const showForm = ref(false);

const form = ref({
    fullName: '',
    addressLine: '',
    phone: '',
    birthYear: new Date().getFullYear() - 30,
    recordType: 'RESIDENT' as ResidentRecordType,
});

async function load() {
    if (!auth.token) {
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        residents.value = await fetchResidents(auth.token);
    } catch (err) {
        error.value = err instanceof Error ? err.message : t('registry.loadFailed');
    } finally {
        loading.value = false;
    }
}

async function submit() {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        await createResident(auth.token, { ...form.value });
        showForm.value = false;
        form.value.fullName = '';
        form.value.addressLine = '';
        form.value.phone = '';
        await load();
    } catch (err) {
        error.value = err instanceof Error ? err.message : t('registry.saveFailed');
    } finally {
        actionLoading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <AppShell
        :title="t('registry.title')"
        :subtitle="auth.user?.barangay?.name ?? auth.user?.full_name"
    >
        <p class="mb-6 max-w-xl text-sm leading-relaxed text-ink-muted">
            {{ t('registry.intro') }}
        </p>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" class="gl-btn-secondary" @click="showForm = !showForm">
                {{ showForm ? t('common.cancel') : t('registry.addRecord') }}
            </button>
        </div>

        <form
            v-if="showForm"
            class="gl-panel mb-6 space-y-3 px-4 py-4 sm:px-5"
            @submit.prevent="submit"
        >
            <label class="block text-sm">
                <span class="text-ink-muted">{{ t('registry.fullName') }}</span>
                <input v-model="form.fullName" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
            </label>
            <label class="block text-sm">
                <span class="text-ink-muted">{{ t('registry.address') }}</span>
                <input v-model="form.addressLine" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
            </label>
            <label class="block text-sm">
                <span class="text-ink-muted">{{ t('registry.phone') }}</span>
                <input v-model="form.phone" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
            </label>
            <div class="grid gap-3 sm:grid-cols-2">
                <label class="block text-sm">
                    <span class="text-ink-muted">{{ t('registry.birthYear') }}</span>
                    <input v-model.number="form.birthYear" type="number" min="1900" class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
                </label>
                <label class="block text-sm">
                    <span class="text-ink-muted">{{ t('registry.recordType') }}</span>
                    <select v-model="form.recordType" class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px">
                        <option value="RESIDENT">RESIDENT</option>
                        <option value="KASAMBAHAY">KASAMBAHAY</option>
                    </select>
                </label>
            </div>
            <button type="submit" class="gl-btn-primary" :disabled="actionLoading">{{ t('registry.saveRecord') }}</button>
        </form>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <p v-if="loading" class="text-sm text-ink-muted">{{ t('registry.loading') }}</p>

        <div v-else class="gl-panel overflow-hidden">
            <p v-if="residents.length === 0" class="px-4 py-10 text-center text-sm text-ink-muted">
                {{ t('registry.empty') }}
            </p>
            <article
                v-for="row in residents"
                :key="row.id"
                class="gl-ledger-row gl-rail gl-rail-warn px-4 py-4 sm:px-5"
            >
                <div class="min-w-0">
                    <p class="font-display text-base font-semibold text-ink">{{ row.fullName }}</p>
                    <p class="mt-1 text-xs text-ink-muted">{{ row.recordType }}</p>
                    <p class="mt-2 text-sm text-ink">{{ row.addressLine }}</p>
                    <p class="mt-1 text-sm text-ink-muted">{{ row.phone }}</p>
                </div>
            </article>
        </div>
    </AppShell>
</template>
