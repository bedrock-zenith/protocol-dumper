// todos
//
// .\GraphicsParameterOverridePacketPayload.json - record type like map
// .\Resource_Pack_Client_Response_-_Downloading.json - some random shi
// .\SerializedNoiseBlockSpecifier.json - default values

import { readdir, readFile, writeFile } from "node:fs/promises";
import {
   FLOAT_MAP,
   INTEGER_MAP,
   type AheadOfTransformFloatType,
   type AheadOfTransformIntegerType,
   type ArrayTypeDefinition,
   type BaseDefinition,
   type BooleanTypeDefinition,
   type EnumDefinition,
   type EnumTypeDefinition,
   type FieldDefinition,
   type Float,
   type FloatTypeDefinition,
   type Integer,
   type IntegerTypeDefinition,
   type OptionalTypeDefinition,
   type PacketDefinition,
   type StringTypeDefinition,
   type StructDefinition,
   type TypeDefinition,
} from "./definitions";
import { basename, join } from "node:path";
import { hash } from "./utils";

type JsonSchemaFileName = string;
type BindTypeName = string;
type HashType = string;
type DumpFileReportTypeMap = {
   enum: EnumDefinition;
   struct: StructDefinition;
   packet: PacketDefinition;
};
type DumpFileReportType = keyof DumpFileReportTypeMap;
interface DumpReport extends BaseDefinition {
   type: DumpFileReportType;
   hash: HashType;
}

export class Registry {
   public readonly input: string;
   public readonly output: string;
   public constructor(input: string, output: string) {
      this.input = input;
      this.output = output;
   }
   public readonly definitions: Map<BindTypeName, DumpReport> = new Map();
   public readonly files: Map<JsonSchemaFileName, object> = new Map();
   public readonly converted: Map<JsonSchemaFileName, DumpReport> = new Map();
   public readonly hashed: Map<HashType, DumpReport> = new Map();

   public async load(): Promise<void> {
      type FileDataPair = { file: string; data: any };
      const enums: FileDataPair[] = [];
      const others: FileDataPair[] = [];

      for await (const file of await readdir(this.input)) {
         if (this.converted.has(file)) return;

         const data = await this.open(file);

         try {
            if (this.typeOf(data) === "enum") {
               enums.push({ file, data });
            } else {
               others.push({ file, data });
            }
         } catch {}
      }

      for (const enumDeclaration of enums) {
         await this.next(enumDeclaration.file, enumDeclaration.data);
      }

      for (const other of others) {
         await this.next(other.file, other.data);
      }
   }

   protected async open(name: string): Promise<any> {
      const path = join(this.input, basename(name));
      return await readFile(path, "utf8").then(JSON.parse);
   }

   protected async next(name: string, data: any): Promise<Context> {
      try {
         const type = this.typeOf(data);
         const context = {
            name: this.normalize(data.title),
            file: name,
         };
         switch (type) {
            case "enum": {
               await this.enum(context, data);
               break;
            }
            case "struct": {
               await this.struct(context, data);
               break;
            }
            default:
               console.log("ignored: " + type);
         }

         return context;
      } catch (err) {
         console.log(name, err);
      }
      return null!;
   }

   public async enum(context: Context, data: any): Promise<void> {
      const fields: Record<string, number> = {};

      (data.enum as Array<string>).forEach((_, i) => (fields[_] = i));

      const backingInteger = this.transformInteger(
         data["x-underlying-type"] as AheadOfTransformIntegerType,
      );

      const key = JSON.stringify({
         enum: fields,
         backing_integer: backingInteger,
      });

      this.finalize(
         "enum",
         {
            name: context.name,
            backing_integer: backingInteger,
            enum: fields,
         },
         hash(key),
         context.file,
      );
   }
   public async enumType(
      context: Context,
      data: any,
   ): Promise<EnumTypeDefinition> {
      const by_value =
         data?.["x-serialization-options"]?.includes("Enum-as-Value");

      return {
         name: context.name,
         is_bind_type: true,
         encoding: by_value ? "value" : "literal-key",
         integer_encoding: by_value ? this.integer(context, data) : undefined!,
      };
   }

   public async type(context: Context, data: any): Promise<TypeDefinition> {
      const isEnum =
         data["x-serialization-options"]?.includes("Enum-as-Value") ||
         Boolean(data.enum);
      if (data.type === "integer") return this.integer(context, data);
      if (data.type === "number") return this.float(context, data);
      if (data.type === "boolean") return this.boolean(context, data);
      if (data.type === "array") return this.array(context, data);
      if (data.type === "string") {
         if (isEnum) {
            await this.enum(context, data);
            return this.enumType(context, data);
         }
         return this.string(context, data);
      }

      // TODO: load the type and get normalized name and not file path
      if (data["$ref"]) {
         const type = await this.reference(data["$ref"]);
         const definition = this.definitions.get(type.name)!;
         if (definition.type === "enum") {
            return this.enumType({ name: type.name, file: null }, data);
         }
         return type;
      }

      //console.log("unknown type", context, data);
      return null!;
   }
   public string(context: Context, data: any): StringTypeDefinition {
      return {
         name: "string",
         is_bind_type: false,
         max_length: data["maxLength"],
         length_type: {
            name: "integer",
            is_bind_type: false,
            encoding: "leb128",
            interpretation: "u32",
         },
      };
   }
   public integer(context: Context, data: any): IntegerTypeDefinition {
      /*
      "type": "integer",
      "x-underlying-type": "uint8",
      "x-ordinal-index": 1,
      "minimum": 0.0,
      "maximum": 255.0
      */

      const underlying = this.transformInteger(data["x-underlying-type"]);

      const isBigEndian =
         data["x-serialization-options"]?.includes("Big Endian");
      const isLittleEndian =
         data["x-serialization-options"]?.includes("Little Endian");
      const hasCompression =
         data["x-serialization-options"]?.includes("Compression");

      return {
         name: "integer",
         is_bind_type: false,
         interpretation: underlying,
         encoding: hasCompression
            ? underlying.startsWith("u")
               ? "leb128"
               : "zleb128"
            : isBigEndian
              ? "big-endian"
              : isLittleEndian
                ? "little-endian"
                : "little-endian", // default value
      };
   }
   public float(context: Context, data: any): FloatTypeDefinition {
      // "snow accumulation max": {
      //     "type": "number",
      //     "x-underlying-type": "float",
      //     "x-ordinal-index": 3
      // },

      const underlying = this.transformFloat(data["x-underlying-type"]);

      const isBigEndian =
         data["x-serialization-options"]?.includes("Big Endian");
      const isLittleEndian =
         data["x-serialization-options"]?.includes("Little Endian");

      return {
         name: "float",
         is_bind_type: false,
         interpretation: underlying,
         encoding: isBigEndian
            ? "big-endian"
            : isLittleEndian
              ? "little-endian"
              : "little-endian", // default value
      };
   }
   public boolean(context: Context, data: any): BooleanTypeDefinition {
      const ENCODING = {
         boolean: "boolean",
      } as const;

      const encoding = ENCODING[data["x-underlying-type"] as "boolean"];
      if (!encoding) throw new ReferenceError("Unknown boolean encoding");

      return { name: "boolean", is_bind_type: false, encoding: encoding };
   }
   public async array(
      context: Context,
      data: any,
   ): Promise<ArrayTypeDefinition> {
      return {
         name: "array",
         is_bind_type: false,
         length_type: {
            name: "integer",
            is_bind_type: false,
            encoding: "leb128",
            interpretation: "u32",
         },
         child_type: await this.type(context, data.items),
         min_length: data.minItems,
         max_length: data.maxItems ?? data.maxProperties,
      };
   }
   public optional(data_type: TypeDefinition): OptionalTypeDefinition {
      return {
         name: "optional",
         is_bind_type: false,
         child_type: data_type,
      };
   }

   public async struct(context: Context, data: any): Promise<void> {
      const fields: Array<FieldDefinition> = [];

      const data_properties = data.properties;

      let keys: string[] = Object.getOwnPropertyNames(data_properties);
      keys.sort(
         (a, b) =>
            data_properties[a]["x-ordinal-index"] -
            data_properties[b]["x-ordinal-index"],
      );

      for (const key of keys) {
         const name = this.normalize(key);
         const field_data = data_properties[key];
         let field: FieldDefinition = {
            name: name,
            details: null,
            type: await this.type(
               { file: null, name: `${context.name} ${name}` },
               field_data,
            ),
         };
         if (!data.required?.includes(key))
            field.type = this.optional(field.type);

         fields.push(field);
      }

      this.finalize(
         "struct",
         {
            name: context.name,
            fields: fields,
         },
         hash(
            JSON.stringify([
               keys.map((k) => data_properties[k]),
               data.required,
            ]),
         ),
         context.file,
      );
   }

   public bind(name: string): TypeDefinition {
      return {
         name: name,
         is_bind_type: true,
      };
   }
   public async reference(ref: string): Promise<TypeDefinition> {
      const name = basename(ref);
      if (this.converted.has(name))
         return {
            name: this.converted.get(name)!.name,
            is_bind_type: true,
         };

      const context = await this.next(name, await this.open(name));

      console.log(context);
      return {
         name: context.name,
         is_bind_type: true,
      };
   }

   protected typeOf(data: any): DumpFileReportType {
      if (typeof data.type === "string") {
         if (data.type === "object") return "struct";
         if (data.type === "string" && "enum" in data) return "enum";
      }
      if (typeof data["$metaProperties"]?.["[cereal:packet]"] === "number")
         return "packet";

      throw new ReferenceError("Unknown Dump Type");
   }
   private transformInteger(type: AheadOfTransformIntegerType): Integer {
      const backingInteger = INTEGER_MAP[type];

      if (!backingInteger) {
         throw new Error(`Unknown integer type: ${type}`);
      }

      return backingInteger;
   }
   private transformFloat(type: AheadOfTransformFloatType): Float {
      const backingFloat = FLOAT_MAP[type];

      if (!backingFloat) {
         throw new Error(`Unknown float type: ${type}`);
      }

      return backingFloat;
   }
   private finalize<T extends DumpFileReportType>(
      type: T,
      definition: DumpFileReportTypeMap[T],
      hash: HashType,
      file: string | null,
   ): DumpReport {
      if (this.hashed.has(hash)) {
         return this.hashed.get(hash)!;
      }
      const data = {
         name: definition.name,
         type: type,
         hash: hash,
         ...(definition as any),
      };

      this.definitions.set(data.name, data);
      this.hashed.set(hash, data);
      if (file) this.converted.set(file, data);
      return data;
   }
   protected normalize(name: string): string {
      return name.toSpacePascalCase().fixed();
   }

   public async dump(): Promise<void> {
      for (const value of this.definitions.values()) {
         this.dumpFile(
            `${value.type}.${value.name.toLowerCase().replaceAll(" ", "-")}.json`,
            value,
         );
      }
   }
   private async dumpFile(name: string, data: any): Promise<void> {
      const path = join(this.output, name);
      await writeFile(path, JSON.stringify(data, null, 3));
      //console.info("dumped: " + path);
   }
}

interface Context {
   name: string;
   file: string | null;
}
