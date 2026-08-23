<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppShell from '@/components/library/layout/AppShell.vue';
import {
    fetchNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '@/api/notifications';
import { useAuthStore } from '@/stores/auth';
import type { AppNotification } from '@/types';

const auth = useAuthStore();
const router = useRouter();

const items = ref<AppNotification[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

async function load() {
    if (!auth.token) {
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        items.value = await fetchNotifications(auth.token);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load notifications';
    } finally {
        loading.value = false;
    }
}

async function openItem(row: AppNotification) {
    if (!auth.token) {
        return;
    }
    if (!row.readAt) {
        try {
            await markNotificationRead(auth.token, row.id);
            row.readAt = new Date().toISOString();
        } catch {
            /* still navigate */
        }
    }
    if (row.href) {
        await router.push(row.href);
    }
}

async function markAll() {
    if (!auth.token) {
        return;
    }
    await markAllNotificationsRead(auth.token);
    await load();
}

function formatWhen(iso: string) {
    return new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
}

onMounted(load);
</script>

<template>
    <AppShell title="Notifications" subtitle="In-app alerts for your role">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p class="max-w-xl text-sm text-ink-muted">
                Task assignments, evidence reviews, and compliance decisions appear here. Email and
                SMS are deferred.
            </p>
            <button type="button" class="gl-btn-secondary" @click="markAll">Mark all read</button>
        </div>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <p v-if="loading" class="text-sm text-ink-muted">Loading notifications…</p>

        <div v-else class="gl-panel overflow-hidden">
            <p v-if="items.length === 0" class="px-4 py-10 text-center text-sm text-ink-muted">
                No notifications yet.
            </p>
            <button
                v-for="row in items"
                :key="row.id"
                type="button"
                class="gl-ledger-row w-full pl-5 text-left"
                @click="openItem(row)"
            >
                <span
                    class="gl-rail"
                    :class="row.readAt ? '' : 'gl-rail-warn'"
                    aria-hidden="true"
                />
                <div class="min-w-0 sm:col-span-2">
                    <div class="flex flex-wrap items-center gap-2">
                        <p class="font-display text-base font-semibold text-ink">{{ row.title }}</p>
                        <span
                            v-if="!row.readAt"
                            class="text-[10px] font-semibold uppercase tracking-wide text-status-warn"
                        >
                            Unread
                        </span>
                    </div>
                    <p class="mt-1 text-sm text-ink-muted">{{ row.body }}</p>
                    <p class="mt-2 text-xs text-ink-muted">{{ formatWhen(row.createdAt) }}</p>
                </div>
            </button>
        </div>
    </AppShell>
</template>
