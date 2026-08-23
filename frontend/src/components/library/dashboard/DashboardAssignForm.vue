<script setup lang="ts">
import type { BarangaySummary, DirectiveTemplate } from '@/types';

export type AssignFormState = {
    templateId: string;
    title: string;
    description: string;
    legalBasis: string;
    dueDate: string;
    barangayId: string;
    assignToAll: boolean;
};

const props = defineProps<{
    form: AssignFormState;
    templates: DirectiveTemplate[];
    barangays: BarangaySummary[];
    actionLoading: boolean;
}>();

const emit = defineEmits<{
    'update:form': [value: AssignFormState];
    templateChange: [templateId: string];
    submit: [];
}>();

function patch(partial: Partial<AssignFormState>) {
    emit('update:form', { ...props.form, ...partial });
}

function onTemplateSelect(event: Event) {
    const templateId = (event.target as HTMLSelectElement).value;
    patch({ templateId });
    emit('templateChange', templateId);
}
</script>

<template>
    <form class="gl-panel space-y-3 p-4" @submit.prevent="$emit('submit')">
        <div class="grid gap-3 sm:grid-cols-2">
            <div class="sm:col-span-2">
                <label class="mb-1 block text-sm font-medium text-ink">DILG template (optional)</label>
                <select
                    :value="form.templateId"
                    class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    style="border-radius: 2px"
                    @change="onTemplateSelect"
                >
                    <option value="">Custom task</option>
                    <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
                        {{ tpl.dilgMcNumber }}
                    </option>
                </select>
            </div>
            <div>
                <label class="mb-1 block text-sm font-medium text-ink">Barangay</label>
                <select
                    :value="form.barangayId"
                    :required="!form.assignToAll"
                    :disabled="form.assignToAll"
                    class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink disabled:bg-brand-soft/40 disabled:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    style="border-radius: 2px"
                    @change="patch({ barangayId: ($event.target as HTMLSelectElement).value })"
                >
                    <option value="" disabled>Select barangay</option>
                    <option v-for="brgy in barangays" :key="brgy.id" :value="brgy.id">
                        {{ brgy.name }}
                    </option>
                </select>
            </div>
            <div>
                <label class="mb-1 block text-sm font-medium text-ink">Due date</label>
                <input
                    :value="form.dueDate"
                    type="date"
                    required
                    class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    style="border-radius: 2px"
                    @input="patch({ dueDate: ($event.target as HTMLInputElement).value })"
                />
            </div>
            <div class="sm:col-span-2">
                <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
                    <input
                        :checked="form.assignToAll"
                        type="checkbox"
                        class="size-4 border-rule"
                        @change="
                            patch({
                                assignToAll: ($event.target as HTMLInputElement).checked,
                                barangayId: '',
                            })
                        "
                    />
                    Assign to all barangays ({{ barangays.length }})
                </label>
            </div>
            <div class="sm:col-span-2">
                <label class="mb-1 block text-sm font-medium text-ink">Title</label>
                <input
                    :value="form.title"
                    required
                    class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    style="border-radius: 2px"
                    @input="patch({ title: ($event.target as HTMLInputElement).value })"
                />
            </div>
            <div class="sm:col-span-2">
                <label class="mb-1 block text-sm font-medium text-ink">Description</label>
                <textarea
                    :value="form.description"
                    required
                    rows="2"
                    class="w-full border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    style="border-radius: 2px"
                    @input="patch({ description: ($event.target as HTMLTextAreaElement).value })"
                />
            </div>
            <div class="sm:col-span-2">
                <label class="mb-1 block text-sm font-medium text-ink">Legal basis</label>
                <input
                    :value="form.legalBasis"
                    required
                    class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    style="border-radius: 2px"
                    @input="patch({ legalBasis: ($event.target as HTMLInputElement).value })"
                />
            </div>
        </div>
        <button type="submit" class="gl-btn-primary disabled:opacity-50" :disabled="actionLoading">
            {{ form.assignToAll ? 'Assign to all barangays' : 'Assign to barangay' }}
        </button>
    </form>
</template>
