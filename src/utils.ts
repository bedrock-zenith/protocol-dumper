import { createHash } from 'node:crypto';

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

export function hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
}
