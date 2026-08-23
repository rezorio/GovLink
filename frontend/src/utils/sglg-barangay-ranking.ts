import type { SglgBarangayScore } from '@/types';
import { sglgScoreVariant } from '@/utils/sglg-score';

export type SglgBandFilter = 'all' | 'strong' | 'watch' | 'critical' | 'unmapped';

export type SglgBarangaySort =
    | 'score-desc'
    | 'score-asc'
    | 'name-asc'
    | 'weakest-asc';

export interface SglgBarangayRankingQuery {
    search: string;
    band: SglgBandFilter;
    sort: SglgBarangaySort;
}

export const SGLG_BAND_OPTIONS: ReadonlyArray<{ id: SglgBandFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'critical', label: 'Critical' },
    { id: 'watch', label: 'Watch' },
    { id: 'strong', label: 'Strong' },
    { id: 'unmapped', label: 'Unmapped' },
];

export const SGLG_SORT_OPTIONS: ReadonlyArray<{ id: SglgBarangaySort; label: string }> = [
    { id: 'score-desc', label: 'Score · high to low' },
    { id: 'score-asc', label: 'Score · low to high' },
    { id: 'weakest-asc', label: 'Weakest pillar first' },
    { id: 'name-asc', label: 'Name · A–Z' },
];

function matchesBand(row: SglgBarangayScore, band: SglgBandFilter): boolean {
    if (band === 'all') {
        return true;
    }
    const variant = sglgScoreVariant(row.overallScore);
    if (band === 'strong') {
        return variant === 'approved';
    }
    if (band === 'watch') {
        return variant === 'pending';
    }
    if (band === 'critical') {
        return variant === 'overdue';
    }
    return variant === 'muted';
}

function scoreSortValue(score: number | null, emptyAs: number): number {
    return score === null ? emptyAs : score;
}

export function filterAndSortSglgBarangays(
    rows: SglgBarangayScore[],
    query: SglgBarangayRankingQuery,
): SglgBarangayScore[] {
    const needle = query.search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
        if (!matchesBand(row, query.band)) {
            return false;
        }
        if (!needle) {
            return true;
        }
        return row.name.toLowerCase().includes(needle);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
        if (query.sort === 'name-asc') {
            return a.name.localeCompare(b.name);
        }
        if (query.sort === 'weakest-asc') {
            const aWeak = scoreSortValue(a.weakestPillar?.score ?? null, 101);
            const bWeak = scoreSortValue(b.weakestPillar?.score ?? null, 101);
            if (aWeak !== bWeak) {
                return aWeak - bWeak;
            }
            return a.name.localeCompare(b.name);
        }
        if (query.sort === 'score-asc') {
            const aScore = scoreSortValue(a.overallScore, -1);
            const bScore = scoreSortValue(b.overallScore, -1);
            if (aScore !== bScore) {
                return aScore - bScore;
            }
            return a.name.localeCompare(b.name);
        }
        // score-desc (default API order)
        const aScore = scoreSortValue(a.overallScore, -1);
        const bScore = scoreSortValue(b.overallScore, -1);
        if (aScore !== bScore) {
            return bScore - aScore;
        }
        return a.name.localeCompare(b.name);
    });

    return sorted;
}
