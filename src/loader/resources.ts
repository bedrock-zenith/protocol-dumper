import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

export class SchemaResources {
    public readonly directory: string;
    private readonly files: Map<string, object> = new Map();
    private constructor(dir: string) {
        this.directory = dir;
    }

    public resolved(file: string): string {
        return basename(file);
    }

    public get(name: string): any | null {
        return this.files.get(this.resolved(name));
    }

    public has(name: string): any {
        return this.files.has(this.resolved(name));
    }

    public iterator(): Iterable<string> {
        return this.files.keys();
    }

    public static async load(directory: string): Promise<SchemaResources> {
        const resources = new SchemaResources(directory);
        for (const path of await readdir(directory)) {
            const file = basename(path);
            const data = await readFile(join(directory, file), 'utf-8').then(JSON.parse);
            resources.files.set(file, data);
        }
        return resources;
    }
}
