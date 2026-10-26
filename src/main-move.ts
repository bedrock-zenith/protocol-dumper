import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { argv } from 'node:process';

const formatVersionDir = (name: string): string => {
    if (name.toLowerCase() === 'latest') {
        return 'latest';
    }

    // Example: 1.26.60.30 -> r26_u6, 1.26.70.21 -> r26_u7
    const parts = name.split('.');
    if (parts.length >= 3) {
        const release = parts[1];
        const updateRaw = Number.parseInt(parts[2] ?? '0', 10);
        const update = Math.floor(updateRaw / 10);
        return `r${release}_u${update}`;
    }

    return name;
};

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

const main = async (): Promise<void> => {
    const rawTarget = getTargetLocation();
    const targetDir = isAbsolute(rawTarget) ? rawTarget : resolve(process.cwd(), rawTarget);

    const dumpDir = 'dump';
    const entries = await readdir(dumpDir, { withFileTypes: true });

    await mkdir(targetDir, { recursive: true }).catch((_) => null);

    for (const entry of entries) {
        const sourcePath = join(dumpDir, entry.name);
        const destName = formatVersionDir(entry.name);
        const destPath = join(targetDir, destName);

        await rm(destPath, { recursive: true, force: true }).catch((): null => null);
        await cp(sourcePath, destPath, { recursive: true });
        // Removing is rookie mistake
        //await rm(sourcePath, { recursive: true, force: true });

        console.log(`Moved: ${entry.name} -> ${destPath}`);
    }
};

await main();
