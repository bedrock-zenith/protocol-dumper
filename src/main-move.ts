import { copyFile, mkdir, readdir, rm, unlink } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { argv } from 'node:process';
import { computeFileHash, formatVersionSubpath, normalizePath } from './utils';

const getTargetLocation = (): string => {
    const args = argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (!arg) continue;

        if (arg === '--path' || arg === '-p') {
            const next = args[i + 1];
            if (next && !next.startsWith('-')) {
                return next;
            }
        }

        if (arg.startsWith('--path=')) {
            return arg.slice('--path='.length);
        }

        if (arg.startsWith('-p=')) {
            return arg.slice('-p='.length);
        }
    }

    const positional = args.find((arg): boolean => Boolean(arg && !arg.startsWith('-')));
    if (positional) {
        return positional;
    }

    throw new Error('Target destination path is required. Usage: pnpm run move --path <path>');
};

const collectFiles = async (dir: string, baseDir: string = dir): Promise<string[]> => {
    const results: string[] = [];
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                const subFiles = await collectFiles(fullPath, baseDir);
                results.push(...subFiles);
            } else if (entry.isFile()) {
                results.push(normalizePath(relative(baseDir, fullPath)));
            }
        }
    } catch {
        // Directory may not exist yet
    }
    return results;
};

const syncDirectory = async (sourceDir: string, destDir: string): Promise<void> => {
    await mkdir(destDir, { recursive: true });

    const [sourceFileList, destFileList] = await Promise.all([
        collectFiles(sourceDir),
        collectFiles(destDir)
    ]);

    const sourceFileSet = new Set(sourceFileList);
    const destFileSet = new Set(destFileList);

    // Set operations (difference and intersection)
    const filesToDelete = destFileSet.difference(sourceFileSet);
    const commonFiles = sourceFileSet.intersection(destFileSet);
    const newFiles = sourceFileSet.difference(destFileSet);

    let updatedCount = 0;
    let deletedCount = 0;
    let unchangedCount = 0;

    // 1. Remove files in dest that are no longer in source
    for (const relPath of filesToDelete) {
        const destPath = join(destDir, relPath);
        await unlink(destPath).catch((): null => null);
        deletedCount++;
    }

    // 2. Copy new files directly
    for (const relPath of newFiles) {
        const sourcePath = join(sourceDir, relPath);
        const destPath = join(destDir, relPath);
        await mkdir(resolve(destPath, '..'), { recursive: true });
        await copyFile(sourcePath, destPath);
        updatedCount++;
    }

    // 3. Compare hashes for common files
    for (const relPath of commonFiles) {
        const sourcePath = join(sourceDir, relPath);
        const destPath = join(destDir, relPath);

        const [srcHash, dstHash] = await Promise.all([
            computeFileHash(sourcePath),
            computeFileHash(destPath).catch(() => null)
        ]);

        if (srcHash !== dstHash) {
            await copyFile(sourcePath, destPath);
            updatedCount++;
        } else {
            unchangedCount++;
        }
    }

    console.log(
        `Synced: ${sourceDir} -> ${destDir} (${updatedCount} updated, ${deletedCount} deleted, ${unchangedCount} unchanged)`
    );
};

const isManagedRootFolder = (name: string): boolean => {
    return /^r\d+$/i.test(name) || name.toLowerCase() === 'latest';
};

const main = async (): Promise<void> => {
    const rawTarget = getTargetLocation();
    const targetDir = isAbsolute(rawTarget) ? rawTarget : resolve(process.cwd(), rawTarget);

    const dumpDir = 'dump';
    const entries = await readdir(dumpDir, { withFileTypes: true });

    await mkdir(targetDir, { recursive: true }).catch((_) => null);

    // Track active target subpaths and top-level root folders
    const validDestPaths = new Set<string>();
    const validRootDirs = new Set<string>();

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const sourcePath = join(dumpDir, entry.name);
        const destSubpath = formatVersionSubpath(entry.name);
        const normalizedSubpath = normalizePath(destSubpath);
        const destPath = join(targetDir, destSubpath);

        validDestPaths.add(normalizedSubpath);

        const [firstSegment] = normalizedSubpath.split('/');
        if (firstSegment) {
            validRootDirs.add(firstSegment);
        }

        await syncDirectory(sourcePath, destPath);
    }

    // Clean up only managed folders (e.g. /rXX or /latest) that are not referenced
    const existingDestEntries = await readdir(targetDir, { withFileTypes: true }).catch(() => []);
    for (const destEntry of existingDestEntries) {
        if (!destEntry.isDirectory()) continue;

        // Safety guard: NEVER mess with folders not starting with rXX or latest (e.g. .git, node_modules, etc.)
        if (!isManagedRootFolder(destEntry.name)) continue;

        if (!validRootDirs.has(destEntry.name)) {
            const orphanPath = join(targetDir, destEntry.name);
            await rm(orphanPath, { recursive: true, force: true }).catch((): null => null);
            console.log(`Removed unreferenced managed root folder: ${orphanPath}`);
            continue;
        }

        // Inside a managed root folder like r26, check subfolders rXX/uX/<protocol>
        if (destEntry.name.toLowerCase() !== 'latest') {
            const rootSubdir = join(targetDir, destEntry.name);
            const uEntries = await readdir(rootSubdir, { withFileTypes: true }).catch(() => []);
            for (const uEntry of uEntries) {
                if (!uEntry.isDirectory()) continue;
                const uSubdir = join(rootSubdir, uEntry.name);
                const protocolEntries = await readdir(uSubdir, { withFileTypes: true }).catch(() => []);

                for (const protoEntry of protocolEntries) {
                    if (!protoEntry.isDirectory()) continue;
                    const fullSubpath = normalizePath(join(destEntry.name, uEntry.name, protoEntry.name));
                    if (!validDestPaths.has(fullSubpath)) {
                        const orphanPath = join(uSubdir, protoEntry.name);
                        await rm(orphanPath, { recursive: true, force: true }).catch((): null => null);
                        console.log(`Removed unreferenced version folder: ${orphanPath}`);
                    }
                }

                // If update folder (u6) becomes empty, clean it up
                const remaining = await readdir(uSubdir).catch(() => []);
                if (remaining.length === 0) {
                    await rm(uSubdir, { recursive: true, force: true }).catch((): null => null);
                }
            }
        }
    }
};

await main();
