import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

declare global {
    interface String {
        toSpacePascalCase(): string;
        fixed(): string;
    }
    type Mutable<T> = { -readonly [K in keyof T]: T[K] };
}

String.prototype.fixed = function (this: string): string {
    return this.replaceAll('::', '.').replaceAll(':', '.');
};
String.prototype.toSpacePascalCase = function (this: string): string {
    return toSpacePascalCase(this);
};

// this function is written by ai, so it might a shi
export function toSpacePascalCase(input: string): string {
    if (!input) return '';

    return (
        input
            // space camelcase
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            // space acronyms
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
            // snake/kebab case space
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
    );
}

export function hash(data: string | Buffer): string {
    return createHash('sha256').update(data).digest('hex');
}

export async function computeFileHash(filePath: string): Promise<string> {
    const buffer = await readFile(filePath);
    return hash(buffer);
}

export function normalizePath(path: string): string {
    return path.replaceAll('\\', '/');
}

export function stringify(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

export const parseVersion = (version: string): number[] => {
    // Strip optional protocol suffix if present, e.g. "1.26.63.1-protocol-776" -> "1.26.63.1"
    const [versionPart] = version.split('-protocol-');
    return (versionPart ?? version).split('.').map((part): number => {
        const num = Number.parseInt(part, 10);
        return Number.isNaN(num) ? 0 : num;
    });
};

export const compareVersions = (a: string, b: string): number => {
    const partsA = parseVersion(a);
    const partsB = parseVersion(b);
    const len = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < len; i++) {
        const numA = partsA[i] ?? 0;
        const numB = partsB[i] ?? 0;
        if (numA !== numB) {
            return numA - numB;
        }
    }
    return a.localeCompare(b);
};

/**
 * Maps a dump folder name into target subpath relative to target root.
 * Structure:
 * - "latest" -> "latest"
 * - "1.26.60.28-protocol-2216" -> join("r26", "u6", "protocol-2216")
 * - "1.26.63.1" -> join("r26", "u6", "1.26.63.1")
 */
export const formatVersionSubpath = (name: string): string => {
    if (name.toLowerCase() === 'latest') {
        return 'latest';
    }

    const [versionPart, ...rest] = name.split('-protocol-');
    const protocolSuffix = rest.length > 0 ? rest.join('-protocol-') : null;

    const parts = versionPart!.split('.');
    if (parts.length >= 3) {
        const release = `r${parts[1]}`;
        const updateRaw = Number.parseInt(parts[2] ?? '0', 10);
        const update = `u${Math.floor(updateRaw / 10)}`;
        const leaf = protocolSuffix ? `${protocolSuffix}` : versionPart!;
        return join(release, update, leaf);
    }

    return name;
};
