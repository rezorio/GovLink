<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppShell from '@/components/library/layout/AppShell.vue';
import LedgerNotice from '@/components/library/feedback/LedgerNotice.vue';
import LedgerSkeleton from '@/components/library/feedback/LedgerSkeleton.vue';
import {
    createComplianceRequirement,
    deactivateComplianceRequirement,
    fetchComplianceRequirements,
    type CreateRequirementPayload,
} from '@/api/compliance';
import { useAuthStore } from '@/stores/auth';
import type { ComplianceRequirement } from '@/types';

const auth = useAuthStore();

const requirements = ref<ComplianceRequirement[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const showForm = ref(false);

const form = ref<CreateRequirementPayload>({
    code: '',
    title: '',
    legalBasis: '',
    category: 'ADMINISTRATIVE',
    frequency: 'ANNUAL',
    evidenceTypes: ['Document upload'],
    weight: 1,
    scope: 'BARANGAY',
});

const evidenceInput = ref('Document upload');

const categories = [
    { value: 'ADMINISTRATIVE', label: 'Administrative (ADM)' },
    { value: 'SOCIAL', label: 'Social (SOC)' },
    { value: 'YOUTH', label: 'Youth / SK' },
    { value: 'MUNICIPAL_SUPERVISION', label: 'Municipal supervision' },
];

const frequencies = [
    { value: 'SEMESTRAL', label: 'Semestral' },
    { value: 'ANNUAL', label: 'Annual' },
    { value: 'TERM', label: 'Term' },
    { value: 'ONGOING', label: 'Ongoing' },
    { value: 'AD_HOC', label: 'Ad hoc' },
    { value: 'MONTHLY', label: 'Monthly' },
];

const systemRows = computed(() =>
    requirements.value.filter((row) => row.municipalityId == null),
);
const municipalRows = computed(() =>
    requirements.value.filter((row) => row.municipalityId != null),
);

function categoryLabel(value: string) {
    return categories.find((item) => item.value === value)?.label ?? value;
}

function frequencyLabel(value: string) {
    return frequencies.find((item) => item.value === value)?.label ?? value;
}

async function loadCatalog() {
    if (!auth.token) return;
    loading.value = true;
    error.value = null;
    try {
        requirements.value = await fetchComplianceRequirements(auth.token, 'BARANGAY');
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load catalog';
    } finally {
        loading.value = false;
    }
}

async function submitCreate() {
    if (!auth.token) return;
    saving.value = true;
    error.value = null;
    success.value = null;
    try {
        const evidenceTypes = evidenceInput.value
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);
        if (evidenceTypes.length === 0) {
            throw new Error('Add at least one evidence type');
        }
        const created = await createComplianceRequirement(auth.token, {
            ...form.value,
            code: form.value.code.trim().toUpperCase(),
            title: form.value.title.trim(),
            legalBasis: form.value.legalBasis.trim(),
            evidenceTypes,
            weight: Number(form.value.weight) || 1,
            scope: 'BARANGAY',
        });
        success.value = `Added ${created.code}. Open current periods on Compliance to push it to all barangays.`;
        showForm.value = false;
        form.value = {
            code: '',
            title: '',
            legalBasis: '',
            category: 'ADMINISTRATIVE',
            frequency: 'ANNUAL',
            evidenceTypes: ['Document upload'],
            weight: 1,
            scope: 'BARANGAY',
        };
        evidenceInput.value = 'Document upload';
        await loadCatalog();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to add requirement';
    } finally {
        saving.value = false;
    }
}

async function removeMunicipal(row: ComplianceRequirement) {
    if (!auth.token || !row.municipalityId) return;
    if (!window.confirm(`Deactivate ${row.code}? New periods will stop including it.`)) {
        return;
    }
    saving.value = true;
    error.value = null;
    try {
        await deactivateComplianceRequirement(auth.token, row.id);
        success.value = `${row.code} deactivated.`;
        await loadCatalog();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to deactivate';
    } finally {
        saving.value = false;
    }
}

onMounted(() => {
    void loadCatalog();
});
</script>

<template>
    <AppShell
        title="Compliance catalog"
        :subtitle="auth.user?.municipality?.name ?? 'Municipality'"
    >
        <p class="mb-6 max-w-3xl text-sm leading-relaxed text-ink-muted">
            Shared municipal checklist for every barangay. Add ADM / SOC / SK items here, then open
            current periods on Compliance so all barangays inherit them.
        </p>

        <div class="mb-4 flex flex-wrap items-center gap-2">
            <RouterLink to="/mayor/compliance" class="gl-btn-secondary">
                Back to barangay list
            </RouterLink>
            <button type="button" class="gl-btn-primary" @click="showForm = !showForm">
                {{ showForm ? 'Hide form' : 'Add requirement' }}
            </button>
        </div>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <p v-if="success" class="mb-4 text-sm text-brand">{{ success }}</p>

        <section v-if="showForm" class="gl-panel mb-6 p-4 sm:p-5">
            <h2 class="font-display text-lg font-semibold text-ink">New shared requirement</h2>
            <p class="mt-1 text-sm text-ink-muted">
                Applies to all barangays in this municipality after you open periods.
            </p>

            <form class="mt-4 grid gap-3 sm:grid-cols-2" @submit.prevent="submitCreate">
                <label class="block text-sm">
                    <span class="mb-1 block font-medium text-ink">Code</span>
                    <input
                        v-model="form.code"
                        required
                        placeholder="ADM-020"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm"
                        style="border-radius: 2px"
                    />
                </label>
                <label class="block text-sm">
                    <span class="mb-1 block font-medium text-ink">Category</span>
                    <select
                        v-model="form.category"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm"
                        style="border-radius: 2px"
                    >
                        <option v-for="item in categories" :key="item.value" :value="item.value">
                            {{ item.label }}
                        </option>
                    </select>
                </label>
                <label class="block text-sm sm:col-span-2">
                    <span class="mb-1 block font-medium text-ink">Title</span>
                    <input
                        v-model="form.title"
                        required
                        minlength="3"
                        placeholder="Submit updated Citizens Charter"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm"
                        style="border-radius: 2px"
                    />
                </label>
                <label class="block text-sm sm:col-span-2">
                    <span class="mb-1 block font-medium text-ink">Legal basis</span>
                    <input
                        v-model="form.legalBasis"
                        required
                        minlength="3"
                        placeholder="RA 7160 Sec. … / DILG MC …"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm"
                        style="border-radius: 2px"
                    />
                </label>
                <label class="block text-sm">
                    <span class="mb-1 block font-medium text-ink">Frequency</span>
                    <select
                        v-model="form.frequency"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm"
                        style="border-radius: 2px"
                    >
                        <option v-for="item in frequencies" :key="item.value" :value="item.value">
                            {{ item.label }}
                        </option>
                    </select>
                </label>
                <label class="block text-sm">
                    <span class="mb-1 block font-medium text-ink">Weight (1–10)</span>
                    <input
                        v-model.number="form.weight"
                        type="number"
                        min="1"
                        max="10"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm"
                        style="border-radius: 2px"
                    />
                </label>
                <label class="block text-sm sm:col-span-2">
                    <span class="mb-1 block font-medium text-ink">Evidence types (comma-separated)</span>
                    <input
                        v-model="evidenceInput"
                        required
                        placeholder="Minutes, Attendance, Signed report"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm"
                        style="border-radius: 2px"
                    />
                </label>
                <div class="sm:col-span-2">
                    <button
                        type="submit"
                        class="gl-btn-primary disabled:opacity-50"
                        :disabled="saving"
                    >
                        Save to municipal catalog
                    </button>
                </div>
            </form>
        </section>

        <LedgerSkeleton v-if="loading" :rows="6" />

        <template v-else>
            <section class="gl-panel mb-6 overflow-hidden">
                <div class="border-b border-rule bg-brand-soft/20 px-4 py-3">
                    <h2 class="font-display text-base font-semibold text-ink">
                        Your municipality additions
                    </h2>
                    <p class="text-xs text-ink-muted">Editable — only this LGU owns these codes</p>
                </div>
                <LedgerNotice
                    v-if="municipalRows.length === 0"
                    title="No custom requirements yet"
                    description="Add ADM / SOC / SK items above. System defaults below still apply to every barangay."
                />
                <ul v-else class="divide-y divide-rule">
                    <li
                        v-for="row in municipalRows"
                        :key="row.id"
                        class="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                    >
                        <div class="min-w-0">
                            <p class="font-mono text-xs font-semibold text-brand">{{ row.code }}</p>
                            <p class="font-display text-sm font-semibold text-ink">{{ row.title }}</p>
                            <p class="mt-1 text-xs text-ink-muted">
                                {{ categoryLabel(row.category) }} · {{ frequencyLabel(row.frequency) }} ·
                                {{ row.legalBasis }}
                            </p>
                        </div>
                        <button
                            type="button"
                            class="gl-btn-secondary disabled:opacity-50"
                            :disabled="saving"
                            @click="removeMunicipal(row)"
                        >
                            Deactivate
                        </button>
                    </li>
                </ul>
            </section>

            <section class="gl-panel overflow-hidden">
                <div class="border-b border-rule bg-brand-soft/20 px-4 py-3">
                    <h2 class="font-display text-base font-semibold text-ink">System catalog</h2>
                    <p class="text-xs text-ink-muted">
                        Shared defaults for all pilot LGUs — read-only here
                    </p>
                </div>
                <ul class="divide-y divide-rule">
                    <li v-for="row in systemRows" :key="row.id" class="px-4 py-3">
                        <p class="font-mono text-xs font-semibold text-brand">{{ row.code }}</p>
                        <p class="font-display text-sm font-semibold text-ink">{{ row.title }}</p>
                        <p class="mt-1 text-xs text-ink-muted">
                            {{ categoryLabel(row.category) }} · {{ frequencyLabel(row.frequency) }} ·
                            {{ row.legalBasis }}
                        </p>
                    </li>
                </ul>
            </section>
        </template>
    </AppShell>
</template>
