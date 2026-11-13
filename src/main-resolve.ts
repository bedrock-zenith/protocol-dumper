import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exit, stderr } from 'node:process';
import type {
    PacketType,
    ProtocolCanonicalNamespace,
    ProtocolNamespace,
    ProtocolType
} from './main-types';
import { compareVersions, stringify } from './utils';

const toEntryFileName = (entry: ProtocolType): string => {
    return `${entry.bind_type}.${entry.name.replaceAll(' ', '-').toLowerCase()}.json`;
};

const TYPE_CATEGORIES = ['enums', 'structs', 'unions', 'aliases', 'symbols'] as const;

const diffPackets = (
    currentPackets: PacketType[] | undefined,
    previousPackets: PacketType[] | undefined
): PacketType[] => {
    if (!currentPackets) return [];
    if (!previousPackets) return [...currentPackets];

    const prevPacketsMap = new Map<number, string>();
    for (const pkt of previousPackets) {
        if (pkt && typeof pkt.id === 'number') {
            prevPacketsMap.set(pkt.id, JSON.stringify(pkt));
        }
    }

    return currentPackets.filter((pkt): boolean => {
        if (!pkt || typeof pkt.id !== 'number') return true;
        const prevPktString = prevPacketsMap.get(pkt.id);
        if (!prevPktString) return true;
        return prevPktString !== JSON.stringify(pkt);
    });
};

const hasProtocolDiff = (diff: ProtocolNamespace): boolean => {
    for (const category of TYPE_CATEGORIES) {
        if (diff[category] && diff[category].length > 0) return true;
    }
    return Boolean(diff.packets && diff.packets.length > 0);
};

const hasCanonicalDiff = (diff: ProtocolCanonicalNamespace): boolean => {
    if (diff.types && diff.types.length > 0) return true;
    return Boolean(diff.packets && diff.packets.length > 0);
};

const main = async (): Promise<void> => {
    const dumpDir = 'dump';
    const entries = await readdir(dumpDir, { withFileTypes: true });
    const versionDirs = entries
        .filter((entry): boolean => entry.isDirectory() && entry.name !== 'latest')
        .map((entry): string => entry.name)
        .sort(compareVersions);

    if (versionDirs.length === 0) {
        stderr.write('No version directories found in dump.\n');
        exit(1);
    }

    console.log(`Found ${versionDirs.length} versions to process: ${versionDirs.join(', ')}`);

    let previousProtocol: ProtocolNamespace | null = null;
    let previousCanonical: ProtocolCanonicalNamespace | null = null;
    let previousVersion: string | null = null;
    let totalChangesDetected = 0;

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

        if (previousVersion !== null) {
            console.log(`Comparing version ${version} against previous version ${previousVersion}...`);
        }

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
                    symbols: [],
                    packets: diffPackets(currentProtocol.packets, previousProtocol.packets)
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
                if (hasProtocolDiff(changes)) {
                    await writeFile(changesPath, stringify(changes));
                    console.log(`Generated ${changesPath} (${previousVersion} -> ${version})`);
                    totalChangesDetected++;
                } else {
                    await rm(changesPath, { force: true }).catch((): null => null);
                    console.log(`No protocol changes between ${previousVersion} and ${version}, skipped ${changesPath}`);
                }
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
                    }),
                    packets: diffPackets(currentCanonical.packets, previousCanonical.packets)
                };

                const diffPath = join(versionPath, '__canonical_protocol_diff__.json');
                if (hasCanonicalDiff(diff)) {
                    await writeFile(diffPath, stringify(diff));
                    console.log(`Generated ${diffPath} (${previousVersion} -> ${version})`);
                    totalChangesDetected++;
                } else {
                    await rm(diffPath, { force: true }).catch((): null => null);
                    console.log(`No canonical changes between ${previousVersion} and ${version}, skipped ${diffPath}`);
                }
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

        previousVersion = version;
    }

    // When there are 2 or more versions compared and zero changes were detected anywhere
    if (versionDirs.length > 1 && totalChangesDetected === 0) {
        stderr.write(`Error: No protocol changes detected across the compared versions (${versionDirs.join(' -> ')}).\n`);
        exit(1);
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
        console.log(`Generated ${latestDir} with all protocol files from latest version (${previousVersion}).`);
    }
};

await main();
