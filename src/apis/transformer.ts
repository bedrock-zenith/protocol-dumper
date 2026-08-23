import { DYNAMIC_VALUE_DESCRIPTION, SCHEMA_KEYS } from "./constants";
import type { SchemaDefinition, SchemaFile } from "../types";
import { Consumer } from "./consumer";
import {
   BindTypeInformation,
   PrimitiveTypeInformation,
   type LayoutInformation,
} from "./information/base";
import {
   AliasInformation,
   SymbolInformation,
} from "./information/layout/symbol";
import { Register } from "./register";
import { Resources } from "./resources";
import "./context";
import { Context } from "./context";
import { StructLayoutInformation } from "./information/layout/struct";
import {
   FloatInformation,
   IntegerInformation,
} from "./information/layout/number";
import { StringInformation } from "./information/layout/string";
import { VoidInformation } from "./information/layout/void";
import { EnumLayoutInformation } from "./information/layout/enum";
import { ArrayInformation } from "./information/layout/array";
import { BooleanInformation } from "./information/layout/boolean";
import { UnionLayoutInformation } from "./information/layout/union";
import { MapLayoutInformation } from "./information/layout/hash-map";
import { DDUIDynamicInformation } from "./information/layout/ddui-dynamic-value";
import { NBTCompoundInformation } from "./information/layout/nbt-compound";

export class Transformer {
   public resources: Resources;
   public register: Register;
   private constructor(resources: Resources, register: Register) {
      this.resources = resources;
      this.register = register;
   }
   public static async from(schemasDir: string): Promise<Transformer> {
      const resources = await Resources.load(schemasDir);
      return new Transformer(resources, new Register());
   }

   public load(): void {
      for (const file of this.resources.iterator()) {
         if (this.register.byFile.has(file)) continue;
         if (file.endsWith("Packet.json")) continue;
         this.file(file);
      }
   }

   public file(file: string): LayoutInformation {
      if (this.register.byFile.has(file))
         return this.register.byFile.get(file)!;

      console.log("consuming: " + file);

      const consumer = Consumer.create(this.resources.get(file));
      const meta = this.consume(consumer);
      const context = Context.create(meta.title, file, this);

      let info = this.resolve(context, consumer);
      if (info.isFinalized) {
         if (info instanceof BindTypeInformation) this.registerBindType(info);
         info = new AliasInformation(context.name, info);
      } else if (info instanceof PrimitiveTypeInformation) {
         info.consume(context, consumer);
         info = new AliasInformation(context.name, info);
      }

      info.consume(context, consumer);
      this.register.mark(file, info);

      if (info instanceof BindTypeInformation) this.registerBindType(info);

      if (!consumer.isConsumed())
         context.throw(
            "Consumer wasn't properly consumed: " +
               JSON.stringify(consumer.getMissingReport()),
         );

      return info;
   }

   public resolve(context: Context, consumer: Consumer): LayoutInformation {
      const name = context.getFullName();
      if (consumer.hasProperty<SchemaDefinition>(SCHEMA_KEYS.REF)) {
         const path = consumer
            .getProperty<SchemaDefinition>(SCHEMA_KEYS.REF)
            .extract("string");

         const file = Resources.resolved(path);
         const ctx = context.find(file);

         if (ctx) return new SymbolInformation(name);

         const type = this.file(file);
         return type;
      }

      if (consumer.hasProperty<SchemaDefinition>(SCHEMA_KEYS.ONE_OF)) {
         return new UnionLayoutInformation(name);
      }

      // // reference is not data component but is valid base component
      if (consumer.hasProperty<SchemaDefinition>(SCHEMA_KEYS.TYPE)) {
         const kind = consumer
            .getProperty<SchemaDefinition>(SCHEMA_KEYS.TYPE)
            .extract("string");

         if (consumer.hasProperty<SchemaDefinition>(SCHEMA_KEYS.ENUM))
            return new EnumLayoutInformation(context.name);

         if (kind === "object") {
            const additional = consumer.getProperty<SchemaDefinition>(
               SCHEMA_KEYS.ADDITIONAL_PROPERTIES,
            );
            if (additional.hasValue()) {
               if (
                  additional
                     .getProperty<SchemaDefinition>("type")
                     .extractOptional("string") === "object" ||
                  consumer.hasProperty<SchemaDefinition>(
                     SCHEMA_KEYS.PROPERTY_NAMES,
                  )
               ) {
                  return new MapLayoutInformation();
                  //throw new ReferenceError("Unimplemented");
                  //return new HashMapComponent(null, null);
               }

               return new MapLayoutInformation();
            }
            return new StructLayoutInformation(name);
         }
         if (kind === "integer") return new IntegerInformation("i32");
         if (kind === "number") return new FloatInformation("f32");
         if (kind === "string") return new StringInformation();
         if (kind === "null") return new VoidInformation();
         if (kind === "array") return new ArrayInformation();
         if (kind === "boolean") return new BooleanInformation();

         throw new TypeError(
            "Can not resolve type at the moment, type: " +
               kind +
               " at: " +
               context.getFullName(),
         );
      }

      if (
         (consumer.getKeys().length === 1 &&
            consumer.getKeys().includes(SCHEMA_KEYS.ORDINAL_INDEX)) ||
         (consumer.getKeys().length === 2 &&
            consumer.getKeys().includes(SCHEMA_KEYS.ORDINAL_INDEX) &&
            consumer
               .getKeys()
               .includes(SCHEMA_KEYS.RUNTIME_CONSTRAINT_DESCRIPTION))
      )
         return new NBTCompoundInformation();

      if (consumer.hasProperty<SchemaDefinition>(SCHEMA_KEYS.DESCRIPTION)) {
         const description = consumer
            .getProperty<SchemaDefinition>(SCHEMA_KEYS.DESCRIPTION)
            .extract("string");
         if (description === DYNAMIC_VALUE_DESCRIPTION)
            return new DDUIDynamicInformation();

         throw new TypeError(
            "Unknown build in type, description: " +
               description +
               " at: " +
               context.getFullName(),
         );
      }
      return new NBTCompoundInformation();
   }

   public registerBindType(type: BindTypeInformation): void {
      //todo: register by hash as well
      console.log("Registering: " + type.name);
      this.register.byName.set(type.name, type);
   }
   public consume(consumer: Consumer): FileMetadata {
      consumer.discardMany<SchemaFile>([
         SCHEMA_KEYS.ID,
         SCHEMA_KEYS.SCHEMA,
         SCHEMA_KEYS.FORMAT_VERSION,
      ]);

      const {
         "x-protocol-version": protocol,
         "x-minecraft-version": minecraft,
         title,
      } = consumer.extractMany({
         "x-protocol-version": "number",
         "x-minecraft-version": "string",
         [SCHEMA_KEYS.TITLE]: "string",
      } satisfies Partial<
         Record<keyof SchemaFile, "number" | "string" | "boolean">
      >);

      return {
         protocol,
         minecraft,
         title: title.toSpacePascalCase().fixed(),
      };
   }
}

export interface FileMetadata {
   protocol: number;
   minecraft: string;
   title: string;
}
