import { join, resolve } from "node:path";
import { DIRECTORY } from "./bds";
import { readdir, readFile } from "node:fs/promises";
import {
   FLOAT_MAP,
   INTEGER_MAP,
   type AheadOfTransformFloatType,
   type AheadOfTransformIntegerType,
   type BaseTypeDefinition,
   type EnumDefinition,
   type FieldDefinition,
   type Float,
   type FloatTypeDefinition,
   type Integer,
   type IntegerTypeDefinition,
   type OptionalTypeDefinition,
   type StructDefinition,
} from "./definitions";

console.log(DIRECTORY);

const protocol_dump = resolve(
   join(DIRECTORY, "docs", "json_schemas", "protocol"),
);

const set = new Set();
for await (const file of await readdir(protocol_dump, {})) {
   const data = JSON.parse(
      await readFile(join(protocol_dump, file)).then((_) => _.toString()),
   );
   if (!data.type && !data["$metaProperties"]) console.log(data);
   if (!set.has(data.type)) console.log(data.type, file);
   set.add(data.type);

   if (data.type)
      switch (data.type) {
         case "object": {
            console.log(
               Object.getOwnPropertyNames(data.properties ?? {})
                  .sort(
                     (a, b) =>
                        data.properties[a]["x-ordinal-index"] -
                        data.properties[b]["x-ordinal-index"],
                  )
                  .map(toSpacePascalCase),
            );
         }
      }
}

async function TransformEnum(
   data: any,
   context: Context,
): Promise<EnumDefinition> {
   // {
   //     "title": "Lesson Action",
   //     "$schema": "http://json-schema.org/draft-07/schema#",
   //     "$id": "/Lesson_Action.json",
   //     "x-format-version": "MISSING VERSION",
   //     "x-minecraft-version": "1.26.50-beta.22",
   //     "x-protocol-version": 2177,
   //     "type": "string",
   //     "enum": [
   //         "Start",
   //         "Complete",
   //         "Restart"
   //     ],
   //     "x-underlying-type": "int8"
   // }

   const returnEnum: Record<string, number> = {};

   for (let i = 0; i < data.enum; ++i) {
      returnEnum[data[i]] = i;
   }

   return {
      name: context.name,
      backing_integer:
         INTEGER_MAP[data["x-underlying-type"] as AheadOfTransformIntegerType],
      enum: returnEnum,
   };
}

interface Context {
   name: string;
}

async function TransformStruct(
   data: any,
   context: Context,
): Promise<StructDefinition> {
   const record: Record<string, FieldDefinition> = {};
   for (const key of Object.getOwnPropertyNames(data.properties)) {
      const name = toSpacePascalCase(key);
      record[key] = {
         name: name,
         type: await TransformType(data.properties[key], { name: name }),
         details: null,
      };

      if (!data.required.includes(key))
         record[key].type = {
            name: "optional",
            is_bind_type: false,
            child_type: record[key].type,
         } satisfies OptionalTypeDefinition;
   }
   return {
      fields: Object.getOwnPropertyNames(data.properties)
         .sort(
            (a, b) =>
               data.properties[a]["x-ordinal-index"] -
               data.properties[b]["x-ordinal-index"],
         )
         .map((_) => record[_]!),
      name: context.name,
   };
}

async function TransformFloat(
   data: any,
   _: Context,
): Promise<FloatTypeDefinition> {
   const type =
      FLOAT_MAP[data["x-underlying-type"] as AheadOfTransformFloatType];
   if (!type || !type.startsWith("f")) {
      throw new Error(`Data Type not supported: ${type}`);
   }

   const isBigEndian = data["x-serialization-options"].includes("Big Endian");
   const isLittleEndian =
      data["x-serialization-options"].includes("Little Endian");

   return {
      name: "float",
      is_bind_type: false,
      interpretation: type as Float,
      encoding: isBigEndian
         ? "big-endian"
         : isLittleEndian
           ? "little-endian"
           : "little-endian", //default little endian
   };
}

async function TransformInteger(
   data: any,
   _: Context,
): Promise<IntegerTypeDefinition> {
   const type =
      INTEGER_MAP[data["x-underlying-type"] as AheadOfTransformIntegerType];
   if (!type) {
      throw new Error(`Data Type not supported: ${type}`);
   }

   const isBigEndian = data["x-serialization-options"].includes("Big Endian");
   const isLittleEndian =
      data["x-serialization-options"].includes("Little Endian");
   const hasCompression =
      data["x-serialization-options"].includes("Compression");

   return {
      name: "integer",
      is_bind_type: false,
      interpretation: type as Integer,
      encoding: hasCompression
         ? type.startsWith("u")
            ? "leb128"
            : "zleb128"
         : isBigEndian
           ? "big-endian"
           : isLittleEndian
             ? "little-endian"
             : "little-endian", // default value
   };
   /*"Actor Runtime ID": {
       "type": "integer",
       "x-underlying-type": "uint64",
       "x-serialization-options": [
           "Compression"
       ],
       "x-ordinal-index": 0,
       "minimum": 0.0
   } */
}

async function TransformType(
   data: any,
   context: Context,
): Promise<BaseTypeDefinition> {
   return {} as any;
}

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
