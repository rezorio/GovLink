<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import { createBacMember, deactivateBacMember, fetchBacMembers } from '@/api/procurement';
import type { BacDesignation, BacMember } from '@/types';

const props = defineProps<{
    token: string;
}>();

const members = ref<BacMember[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const showForm = ref(false);

const form = ref({
    displayName: '',
    designation: 'MEMBER' as BacDesignation,
    termStart: `${new Date().getFullYear()}-01-01`,
    designationDate: new Date().toISOString().slice(0, 10),
});

const activeMembers = computed(() => members.value.filter((m) => m.isActive));
const rosterReady = computed(() => {
    const active = activeMembers.value;
    return active.length >= 5 && active.some((m) => m.designation === 'CHAIR');
});

async function load() {
    loading.value = true;
    error.value = null;
    try {
        members.value = await fetchBacMembers(props.token);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load BAC roster';
    } finally {
        loading.value = false;
    }
}

async function submit() {
    actionLoading.value = true;
    error.value = null;
    try {
        await createBacMember(props.token, { ...form.value });
        showForm.value = false;
        form.value.displayName = '';
        form.value.designation = 'MEMBER';
        await load();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Create failed';
    } finally {
        actionLoading.value = false;
    }
}

async function deactivate(id: string) {
    actionLoading.value = true;
    error.value = null;
    try {
        await deactivateBacMember(props.token, id);
        await load();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Deactivate failed';
    } finally {
        actionLoading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <section class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 class="font-display text-lg font-semibold text-ink">Bids and Awards Committee</h2>
                <p class="text-xs text-ink-muted">
                    5–7 SB members (PB designates; PB is not a voting member). Required before award
                    recommendation.
                </p>
            </div>
            <StatusBadge
                :status="rosterReady ? 'approved' : 'pending'"
                :label="rosterReady ? 'Roster ready' : `${activeMembers.length}/5+`"
            />
        </div>

        <div
            v-if="error"
            class="border border-status-danger/40 bg-status-danger/5 px-3 py-2 text-sm text-status-danger"
            style="border-radius: 2px"
        >
            {{ error }}
        </div>

        <div v-if="loading" class="text-sm text-ink-muted">Loading BAC roster…</div>
        <div v-else class="gl-panel overflow-hidden">
            <div
                v-if="members.length === 0"
                class="px-4 py-4 text-sm text-ink-muted sm:px-5"
            >
                No BAC members designated yet.
            </div>
            <div
                v-for="row in members"
                :key="row.id"
                class="gl-ledger-row gl-rail flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-5"
                :class="row.isActive ? 'gl-rail-ok' : 'gl-rail'"
            >
                <div class="min-w-0">
                    <p class="text-sm font-medium text-ink">
                        {{ row.displayName }}
                        <span v-if="!row.isActive" class="text-ink-muted"> (inactive)</span>
                    </p>
                    <p class="text-xs text-ink-muted">{{ row.designation }}</p>
                </div>
                <button
                    v-if="row.isActive"
                    type="button"
                    class="gl-btn-warn"
                    :disabled="actionLoading"
                    @click="deactivate(row.id)"
                >
                    Deactivate
                </button>
            </div>
        </div>

        <button
            v-if="!showForm"
            type="button"
            class="gl-btn-primary"
            :disabled="actionLoading || activeMembers.length >= 7"
            @click="showForm = true"
        >
            Designate member
        </button>

        <form
            v-else
            class="gl-panel space-y-3 px-4 py-4 sm:px-5"
            @submit.prevent="submit"
        >
            <label class="block text-sm">
                <span class="text-ink-muted">Full name</span>
                <input
                    v-model="form.displayName"
                    required
                    minlength="2"
                    class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                    style="border-radius: 2px"
                />
            </label>
            <label class="block text-sm">
                <span class="text-ink-muted">Designation</span>
                <select
                    v-model="form.designation"
                    class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                    style="border-radius: 2px"
                >
                    <option value="CHAIR">CHAIR</option>
                    <option value="VICE_CHAIR">VICE_CHAIR</option>
                    <option value="MEMBER">MEMBER</option>
                </select>
            </label>
            <div class="grid gap-3 sm:grid-cols-2">
                <label class="block text-sm">
                    <span class="text-ink-muted">Term start</span>
                    <input
                        v-model="form.termStart"
                        type="date"
                        required
                        class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                        style="border-radius: 2px"
                    />
                </label>
                <label class="block text-sm">
                    <span class="text-ink-muted">Designation date</span>
                    <input
                        v-model="form.designationDate"
                        type="date"
                        required
                        class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                        style="border-radius: 2px"
                    />
                </label>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="gl-btn-primary" :disabled="actionLoading">Save</button>
                <button type="button" class="gl-btn-warn" @click="showForm = false">Cancel</button>
            </div>
        </form>
    </section>
</template>
