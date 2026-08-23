export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function normalizePagination(page?: number, pageSize?: number) {
    const normalizedPage = Math.max(1, page ?? 1);
    const normalizedSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, pageSize ?? DEFAULT_PAGE_SIZE),
    );
    return {
        page: normalizedPage,
        pageSize: normalizedSize,
        skip: (normalizedPage - 1) * normalizedSize,
        take: normalizedSize,
    };
}

export function paginatedResult<T>(items: T[], total: number, page: number, pageSize: number) {
    return {
        items,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
}
