import { en } from './locales/en';
import { tl } from './locales/tl';
import type { Locale, MessageTree } from './types';

const catalogs: Record<Locale, MessageTree> = { en, tl };

function resolvePath(tree: MessageTree, path: string): string | undefined {
    const value = path.split('.').reduce<unknown>((node, segment) => {
        if (node && typeof node === 'object' && segment in (node as MessageTree)) {
            return (node as MessageTree)[segment];
        }
        return undefined;
    }, tree);

    return typeof value === 'string' ? value : undefined;
}

export function translate(
    locale: Locale,
    key: string,
    params?: Record<string, string | number>,
): string {
    const template = resolvePath(catalogs[locale], key) ?? resolvePath(catalogs.en, key) ?? key;

    if (!params) {
        return template;
    }

    return template.replace(/\{(\w+)\}/g, (_, token: string) =>
        token in params ? String(params[token]) : `{${token}}`,
    );
}

export function assignmentStatusLabel(locale: Locale, status: string): string {
    return translate(locale, `assignmentStatus.${status}`);
}

export function complianceStatusLabel(locale: Locale, status: string): string {
    return translate(locale, `complianceStatus.${status}`);
}
