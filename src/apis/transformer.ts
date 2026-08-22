import type { SchemaDefinition, SchemaFile } from "../types";
import { Consumer } from "./consumer";
import type { LayoutInformation } from "./information/base";
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

      let type = this.resolve(context, consumer);
      if (consumer.hasProperty<SchemaDefinition>("$ref")) {
         type = new AliasInformation(context.name, type);
      }
      this.register.mark(file, type);

      type.consume(context, consumer);

      if (!consumer.isConsumed())
         context.throw(
            "Consumer wasn't properly consumed: " +
               JSON.stringify(consumer.getMissingReport()),
         );

      this.register.byName.set(type.name, type);
      return type;
   }

   public resolve(context: Context, consumer: Consumer): LayoutInformation {
      const name = context.getFullName();
      if (consumer.hasProperty<SchemaDefinition>("$ref")) {
         const path = consumer
            .getProperty<SchemaDefinition>("$ref")
            .extract("string");

         const file = Resources.resolved(path);
         const ctx = context.find(file);

         if (ctx) return new SymbolInformation(name);

         const type = this.file(file);
         return type;
      }

      if (consumer.hasProperty<SchemaDefinition>("oneOf")) {
         return new UnionLayoutInformation(name);
      }

      // // reference is not data component but is valid base component
      if (consumer.hasProperty<SchemaDefinition>("type")) {
         const kind = consumer
            .getProperty<SchemaDefinition>("type")
            .extract("string");

         if (consumer.hasProperty<SchemaDefinition>("enum"))
            return new EnumLayoutInformation();

         if (kind === "object") {
            const additional = consumer.getProperty<SchemaDefinition>(
               "additionalProperties",
            );
            if (additional.hasValue()) {
               if (
                  additional
                     .getProperty<SchemaDefinition>("type")
                     .extractOptional("string") === "object" ||
                  consumer.hasProperty<SchemaDefinition>("propertyNames")
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
            consumer.getKeys().includes("x-ordinal-index")) ||
         (consumer.getKeys().length === 2 &&
            consumer.getKeys().includes("x-ordinal-index") &&
            consumer.getKeys().includes("x-runtime-constraint-description"))
      )
         return new VoidInformation();

      if (consumer.hasProperty<SchemaDefinition>("description")) {
         const description = consumer
            .getProperty<SchemaDefinition>("description")
            .extract("string");
         if (description === "Dynamic value")
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

   public consume(consumer: Consumer): FileMetadata {
      consumer.discardMany<SchemaFile>(["$id", "$schema", "x-format-version"]);

      const {
         "x-protocol-version": protocol,
         "x-minecraft-version": minecraft,
         title,
      } = consumer.extractMany({
         "x-protocol-version": "number",
         "x-minecraft-version": "string",
         title: "string",
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
