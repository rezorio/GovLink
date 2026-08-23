import { AssemblySemester } from '@prisma/client';

/** 1st semester assembly window — typically by end of March (Proc. 260 / DILG calendar). */
export function periodForSemester(
    semester: AssemblySemester,
    now = new Date(),
): { periodLabel: string; dueDate: Date } {
    const year = now.getFullYear();
    if (semester === AssemblySemester.H1) {
        return {
            periodLabel: `${year}-H1`,
            dueDate: new Date(Date.UTC(year, 2, 31)), // March 31
        };
    }
    return {
        periodLabel: `${year}-H2`,
        dueDate: new Date(Date.UTC(year, 8, 30)), // September 30
    };
}

export function semesterLabel(semester: AssemblySemester): string {
    return semester === AssemblySemester.H1
        ? '1st Semester Barangay Assembly'
        : '2nd Semester Barangay Assembly';
}

export function allCurrentSemesters(now = new Date()) {
    return [AssemblySemester.H1, AssemblySemester.H2].map((semester) => ({
        semester,
        ...periodForSemester(semester, now),
        label: semesterLabel(semester),
    }));
}
