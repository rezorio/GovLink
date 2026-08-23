/** Format centavos string/number as PHP display. */
export function formatPhpCentavos(centavos: string | number): string {
    const n = typeof centavos === 'string' ? Number(centavos) : centavos;
    if (Number.isNaN(n)) {
        return '—';
    }
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(n / 100);
}

export function pesosToCentavos(pesos: number): number {
    return Math.round(pesos * 100);
}
