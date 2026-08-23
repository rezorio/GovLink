/** Mask email for municipal / cross-role viewers (RA 10173). */
export function maskEmail(email: string): string {
    const trimmed = email.trim();
    const at = trimmed.indexOf('@');
    if (at <= 0) {
        return '***';
    }
    const local = trimmed.slice(0, at);
    const domain = trimmed.slice(at + 1);
    const visible = local.slice(0, Math.min(1, local.length));
    return `${visible}***@${domain}`;
}

/** Mask mobile/landline — keep country/area prefix and last two digits. */
export function maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) {
        return '***';
    }
    const prefix = digits.slice(0, Math.min(4, digits.length - 2));
    const suffix = digits.slice(-2);
    return `${prefix}-***-**${suffix}`;
}

/** Redact street-level detail; keep sitio/purok label when comma-separated. */
export function maskAddress(address: string): string {
    const trimmed = address.trim();
    if (!trimmed) {
        return '[address redacted]';
    }
    const parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
        return `${parts[0]} · [address redacted]`;
    }
    return '[address redacted]';
}
