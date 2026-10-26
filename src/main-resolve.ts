import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface ProtocolType {
    name: string;
    hash: string;
    bind_type: string;
    [key: string]: unknown;
}

interface ProtocolNamespace {
    name: string;
    bind_type: string;
    is_bind_type: boolean;
    enums: ProtocolType[];
    structs: ProtocolType[];
    unions: ProtocolType[];
    aliases: ProtocolType[];
    symbols: ProtocolType[];
    [key: string]: unknown;
}

interface ProtocolCanonicalNamespace {
    name: string;
    bind_type: string;
    is_bind_type: boolean;
    types: ProtocolType[];
    [key: string]: unknown;
}

const parseVersion = (version: string): number[] => {
    return version.split('.').map((part): number => {
        const num = Number.parseInt(part, 10);
        return Number.isNaN(num) ? 0 : num;
    });
};

const compareVersions = (a: string, b: string): number => {
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

const stringify = (value: unknown): string => JSON.stringify(value, null, 2);

const toEntryFileName = (entry: ProtocolType): string => {
    return `${entry.bind_type}.${entry.name.replaceAll(' ', '-').toLowerCase()}.json`;
};

const TYPE_CATEGORIES = ['enums', 'structs', 'unions', 'aliases', 'symbols'] as const;

const main = async (): Promise<void> => {
    const dumpDir = 'dump';
    const entries = await readdir(dumpDir, { withFileTypes: true });
    const versionDirs = entries
        .filter((entry): boolean => entry.isDirectory() && entry.name !== 'latest')
        .map((entry): string => entry.name)
        .sort(compareVersions);

    let previousProtocol: ProtocolNamespace | null = null;
    let previousCanonical: ProtocolCanonicalNamespace | null = null;

    for (const version of versionDirs) {
        const versionPath = join(dumpDir, version);
        const protocolFile = join(versionPath, '__protocol__.json');
        const canonicalFile = join(versionPath, '__canonical_protocol__.json');

        let rawProtocol: string | null = null;
        try {
            rawProtocol = await readFile(protocolFile, 'utf8');
        } catch {
            console.warn(`Skipping protocol for ${version}: ${protocolFile} not found.`);
        }

        let rawCanonical: string | null = null;
        try {
            rawCanonical = await readFile(canonicalFile, 'utf8');
        } catch {
            console.warn(`Skipping canonical for ${version}: ${canonicalFile} not found.`);
        }

        if (!rawProtocol && !rawCanonical) {
            console.warn(`Skipping ${version}: Neither ${protocolFile} nor ${canonicalFile} found.`);
            continue;
        }

        const currentProtocol: ProtocolNamespace | null = rawProtocol ? JSON.parse(rawProtocol) : null;
        const currentCanonical: ProtocolCanonicalNamespace | null = rawCanonical
            ? JSON.parse(rawCanonical)
            : null;

        const filesToRemove = new Set<string>();

        if (currentProtocol !== null) {
            if (previousProtocol !== null) {
                // Collect hashes of types in previous version keyed by type category and name (or hash set)
                const previousHashMap = new Map<string, Set<string>>();
                for (const category of TYPE_CATEGORIES) {
                    const hashes = new Set<string>();
                    for (const item of previousProtocol[category] ?? []) {
                        if (item && item.hash) {
                            hashes.add(item.hash);
                        }
                    }
                    previousHashMap.set(category, hashes);
                }

                const changes: ProtocolNamespace = {
                    ...currentProtocol,
                    enums: [],
                    structs: [],
                    unions: [],
                    aliases: [],
                    symbols: []
                };

                for (const category of TYPE_CATEGORIES) {
                    const prevHashes = previousHashMap.get(category);
                    const currentItems = currentProtocol[category] ?? [];
                    changes[category] = currentItems.filter((item): boolean => {
                        if (!item || !item.hash) return true;
                        const isUnchanged = prevHashes?.has(item.hash);
                        if (isUnchanged && item.bind_type && item.name) {
                            filesToRemove.add(toEntryFileName(item));
                        }
                        return !isUnchanged;
                    });
                }

                const changesPath = join(versionPath, '__protocol_diff__.json');
                await writeFile(changesPath, stringify(changes));
                console.log(`Generated ${changesPath}`);
            }

            previousProtocol = currentProtocol;
        }

        if (currentCanonical !== null) {
            if (previousCanonical !== null) {
                const prevCanonicalHashes = new Set<string>();
                for (const item of previousCanonical.types ?? []) {
                    if (item && item.hash) {
                        prevCanonicalHashes.add(item.hash);
                    }
                }

                const diff: ProtocolCanonicalNamespace = {
                    ...currentCanonical,
                    types: (currentCanonical.types ?? []).filter((item): boolean => {
                        if (!item || !item.hash) return true;
                        const isUnchanged = prevCanonicalHashes.has(item.hash);
                        if (isUnchanged && item.bind_type && item.name) {
                            filesToRemove.add(toEntryFileName(item));
                        }
                        return !isUnchanged;
                    })
                };

                const diffPath = join(versionPath, '__canonical_protocol_diff__.json');
                await writeFile(diffPath, stringify(diff));
                console.log(`Generated ${diffPath}`);
            }

            previousCanonical = currentCanonical;
        }

        if (filesToRemove.size > 0) {
            await Promise.all(
                Array.from(filesToRemove).map(async (filename): Promise<void> => {
                    const filePath = join(versionPath, filename);
                    await rm(filePath, { force: true }).catch((): null => null);
                })
            );
            console.log(`Removed ${filesToRemove.size} unchanged files from ${versionPath}`);
        }
    }

    if (previousCanonical !== null || previousProtocol !== null) {
        const latestDir = join(dumpDir, 'latest');
        await rm(latestDir, { recursive: true, force: true }).catch((): null => null);
        await mkdir(latestDir, { recursive: true });

        const itemsToDump: ProtocolType[] =
            previousCanonical !== null
                ? (previousCanonical.types ?? [])
                : TYPE_CATEGORIES.flatMap((category) => previousProtocol?.[category] ?? []);

        await Promise.all(
            itemsToDump.map(async (item): Promise<void> => {
                if (!item?.bind_type || !item?.name) return;
                const fileName = toEntryFileName(item);
                await writeFile(join(latestDir, fileName), stringify(item));
            })
        );

        if (previousProtocol !== null) {
            await writeFile(join(latestDir, '__protocol__.json'), stringify(previousProtocol));
        }
        if (previousCanonical !== null) {
            await writeFile(join(latestDir, '__canonical_protocol__.json'), stringify(previousCanonical));
        }
        console.log(`Generated ${latestDir} with all protocol files from latest version.`);
    }
};

await main();
