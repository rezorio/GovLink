import { PlanType } from '@prisma/client';

/** Current BDP term window (approximation for demo/MVP). */
export function currentBdpPeriod(now = new Date()): { periodLabel: string; dueDate: Date } {
    const year = now.getFullYear();
    // Align to typical 2025–2028 election term window for 2026 demos
    const termStart = year <= 2028 ? 2025 : year - ((year - 2025) % 3);
    const termEnd = termStart + 3;
    return {
        periodLabel: `${termStart}-${termEnd}`,
        dueDate: new Date(Date.UTC(termStart, 5, 30)), // June 30 of term start year
    };
}

export function currentAipPeriod(now = new Date()): { periodLabel: string; dueDate: Date } {
    const year = now.getFullYear();
    return {
        periodLabel: `FY ${year}`,
        // Q4 finalization target — Oct 31 of current year
        dueDate: new Date(Date.UTC(year, 9, 31)),
    };
}

export function periodForPlanType(planType: PlanType, now = new Date()) {
    return planType === PlanType.BDP ? currentBdpPeriod(now) : currentAipPeriod(now);
}

export function planTypeLabel(planType: PlanType): string {
    return planType === PlanType.BDP ? 'Barangay Development Plan' : 'Annual Investment Program';
}
