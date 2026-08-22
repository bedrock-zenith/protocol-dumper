import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

export class Resources {
   public readonly directory: string;
   private readonly files: Map<string, object> = new Map();
   private constructor(dir: string) {
      this.directory = dir;
   }

   public static resolved(file: string): string {
      return basename(file);
   }

   public get(name: string): any | null {
      return this.files.get(Resources.resolved(name));
   }

   public has(name: string): any {
      return this.files.has(Resources.resolved(name));
   }

   public iterator(): Iterable<string> {
      return this.files.keys();
   }

   public static async load(directory: string): Promise<Resources> {
      const resources = new Resources(directory);
      for (const path of await readdir(directory)) {
         const file = basename(path);
         const data = await readFile(join(directory, file), "utf-8").then(
            JSON.parse,
         );
         resources.files.set(file, data);
      }
      return resources;
   }
}
