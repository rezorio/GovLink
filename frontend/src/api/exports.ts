export async function downloadComplianceScorecardPdf(token: string, periodLabel?: string) {
    const query = periodLabel ? `?periodLabel=${encodeURIComponent(periodLabel)}` : '';
    return downloadBinary(
        `/exports/compliance-scorecard.pdf${query}`,
        token,
        'compliance_scorecard.pdf',
    );
}

export async function downloadComplianceScorecardExcel(token: string, periodLabel?: string) {
    const query = periodLabel ? `?periodLabel=${encodeURIComponent(periodLabel)}` : '';
    return downloadBinary(
        `/exports/compliance-scorecard.xlsx${query}`,
        token,
        'compliance_scorecard.xlsx',
    );
}

async function downloadBinary(path: string, token: string, fallbackName: string) {
    const base = import.meta.env.VITE_API_BASE ?? '/api';
    const response = await fetch(`${base}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        let message = `Download failed (${response.status})`;
        try {
            const body = (await response.json()) as { message?: string | string[] };
            if (typeof body.message === 'string') {
                message = body.message;
            } else if (Array.isArray(body.message)) {
                message = body.message.join(', ');
            }
        } catch {
            /* ignore non-JSON error bodies */
        }
        throw new Error(message);
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] ?? fallbackName;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
