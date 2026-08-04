import { writeFile } from "node:fs/promises";
import {
   INTEGER_MAP,
   type AheadOfTransformIntegerType,
   type BaseDefinition,
   type EnumDefinition,
   type FileDefinition,
   type PacketDefinition,
   type StructDefinition,
} from "./definitions";
import { join } from "node:path";

type FileType = "packet-metadata" | "struct" | "enum";
interface Context {
   name: string;
}
export class Registry {
   public readonly packet: Map<string, PacketDefinition> = new Map();
   public readonly enums: Map<string, EnumDefinition> = new Map();
   public readonly structs: Map<string, StructDefinition> = new Map();
   public readonly definitions: Map<string, BaseDefinition> = new Map();
   public readonly transformer: Transformer = new Transformer();

   public appendFile(file: string, data: any): void {
      const type = this.getFileType(data);
      if (!type) {
         return; //lets ignore for now
         //throw new ReferenceError("Unknown file type: " + file);
      }
      switch (type) {
         case "enum": {
            this.appendEnum(
               {
                  name: (data.title as string).toSpacePascalCase().fixed(),
               },
               data,
            );
            break;
         }
         default:
            console.log("ignored: " + type);
      }
   }
   public appendEnum(context: Context, data: any): void {
      const returnEnum: Record<string, number> = {};

      (data.enum as Array<string>).forEach((_, i) => (returnEnum[_] = i));

      this.enums.set(context.name, {
         name: context.name,
         backing_integer:
            INTEGER_MAP[
               data["x-underlying-type"] as AheadOfTransformIntegerType
            ],
         enum: returnEnum,
      });
   }

   public getFileType(file_data: any): FileType | null {
      if (typeof file_data.type === "string") {
         if (file_data.type === "object") return "struct";
         if (file_data.type === "string" && "enum" in file_data) return "enum";
      }
      if (typeof file_data["$metaProperties"]?.["[cereal:packet]"] === "number")
         return "packet-metadata";

      return null;
   }

   public async dump(directory: string): Promise<void> {
      for (const key of this.enums.keys()) {
         const value = this.enums.get(key)!;
         this.dumpFile(
            join(
               directory,
               `enum.${key.toLowerCase().replaceAll(" ", "-")}.json`,
            ),
            value,
         );
      }
   }
   private async dumpFile(file: string, data: any): Promise<void> {
      await writeFile(file, JSON.stringify(data, null, 3));
      console.info("dumped: " + file);
   }
}

export class Transformer {
   async *parse(file_data: any): AsyncGenerator<FileDefinition> {
      const file_type = await this.getFileType(file_data);
      if (file_type === null)
         throw new ReferenceError(
            "Unknown file type: " + JSON.stringify(file_data),
         );

      switch (file_type) {
         case "packet-metadata": {
            yield {
               data: { name: "file_data.title", is_bind_type: true } as any,
               kind: "metadata",
               name: file_data.title,
               protocol: file_data["x-protocol-version"],
            };
         }
      }
   }
   async getFileType(file_data: any): Promise<FileType | null> {
      if (typeof file_data.type === "string") {
         if (file_data.type === "object") return "struct";
         if (file_data.type === "string" && "enum" in file_data) return "enum";
      }
      if (typeof file_data["$metaProperties"]?.["[cereal:packet]"] === "number")
         return "packet-metadata";

      return null;
   }
}

declare global {
   interface String {
      toSpacePascalCase(): string;
      fixed(): string;
   }
}
String.prototype.fixed = function (this: string): string {
   return this.replaceAll("::", ".").replaceAll(":", ".");
};
String.prototype.toSpacePascalCase = function (this: string): string {
   return toSpacePascalCase(this);
};
/**
 * Converts any input string into "Space Pascal Case" (Title Case).
 * * Examples:
 * - "camelCase"                   -> "Camel Case"
 * - "PascalCase"                  -> "Pascal Case"
 * - "snake_case_example"          -> "Snake Case Example"
 * - "kebab-case-example"          -> "Kebab Case Example"
 * - "space case example"          -> "Space Case Example"
 * - "XMLParser_and-someHTTPClient" -> "Xml Parser And Some Http Client"
 */
export function toSpacePascalCase(input: string): string {
   if (!input) return "";

   return (
      input
         // Insert space between lowercase letter/number and uppercase letter (e.g., "camelCase" -> "camel Case")
         .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
         // Insert space between acronyms and subsequent capitalized words (e.g., "XMLParser" -> "XML Parser")
         .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
         // Replace all non-alphanumeric characters (underscores, hyphens, symbols) with spaces
         .replace(/[^a-zA-Z0-9]+/g, " ")
         // Clean up whitespace
         .trim()
         // Split into individual word tokens
         .split(/\s+/)
         // Capitalize the first letter and lowercase the rest for each word
         .map(
            (word) =>
               word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
         )
         // Join with a single space
         .join(" ")
   );
}
