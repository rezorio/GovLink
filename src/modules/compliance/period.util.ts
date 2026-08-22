import { ComplianceFrequency, ComplianceStatus } from '@prisma/client';

export type PeriodSpec = {
    periodLabel: string;
    dueDate: Date;
};

/** Manila calendar parts (Asia/Manila). */
export function manilaYmd(now = new Date()): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);

    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    return { year, month, day };
}

function utcDate(year: number, month1Based: number, day: number): Date {
    return new Date(Date.UTC(year, month1Based - 1, day));
}

/**
 * Current reporting period for a requirement frequency.
 * AD_HOC is skipped (opened manually later).
 */
export function currentPeriodForFrequency(
    frequency: ComplianceFrequency,
    now = new Date(),
): PeriodSpec | null {
    const { year, month } = manilaYmd(now);

    switch (frequency) {
        case ComplianceFrequency.SEMESTRAL: {
            const half = month <= 6 ? 1 : 2;
            return {
                periodLabel: `${year}-H${half}`,
                dueDate: half === 1 ? utcDate(year, 6, 30) : utcDate(year, 12, 31),
            };
        }
        case ComplianceFrequency.ANNUAL:
            return {
                periodLabel: `${year}`,
                dueDate: utcDate(year, 12, 31),
            };
        case ComplianceFrequency.TERM: {
            const termStart = year < 2025 ? 2023 : 2025;
            const termEnd = termStart + 3;
            return {
                periodLabel: `Term ${termStart}-${termEnd}`,
                dueDate: utcDate(termEnd, 6, 30),
            };
        }
        case ComplianceFrequency.ONGOING:
            return {
                periodLabel: `${year}-ongoing`,
                dueDate: utcDate(year, 12, 31),
            };
        case ComplianceFrequency.MONTHLY: {
            const lastDay = utcDate(year, month + 1, 0).getUTCDate();
            return {
                periodLabel: `${year}-${String(month).padStart(2, '0')}`,
                dueDate: utcDate(year, month, lastDay),
            };
        }
        case ComplianceFrequency.AD_HOC:
            return null;
        default:
            return null;
    }
}

const OPEN_STATUSES: ComplianceStatus[] = [
    ComplianceStatus.NOT_STARTED,
    ComplianceStatus.IN_PROGRESS,
];

/** Treat past-due open items as OVERDUE without writing to DB. */
export function effectiveComplianceStatus(
    status: ComplianceStatus,
    dueDate: Date,
    now = new Date(),
): ComplianceStatus {
    if (!OPEN_STATUSES.includes(status)) {
        return status;
    }
    const { year, month, day } = manilaYmd(now);
    const today = utcDate(year, month, day);
    const due = utcDate(dueDate.getUTCFullYear(), dueDate.getUTCMonth() + 1, dueDate.getUTCDate());
    return due < today ? ComplianceStatus.OVERDUE : status;
}
