import type { SchemaDefinition } from "../types";
import { Consumer } from "./consumer";
import { Context } from "./context";
import { SchemaResources } from "./resources";
import { BaseComponent, ReferenceComponent } from "./types";
import { ArrayComponent } from "./types/array-component";
import { BooleanComponent } from "./types/boolean-component";
import { EnumComponent } from "./types/enum-component";
import { FileComponent } from "./types/file-component";
import { HashMapComponent, HashSetComponent } from "./types/hash-component";
import {
   DDUIDynamicValue,
   NBTCComponent,
   VoidDataComponent,
} from "./types/built-ins";
import { FloatComponent, IntegerComponent } from "./types/number-component";
import { StringComponent } from "./types/string-component";
import { StructComponent } from "./types/struct-component";
import { UnionComponent } from "./types/union-component";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DataComponent } from "./types/data-component";

export class Transformer {
   public readonly resources: SchemaResources;
   public readonly byFile: Map<string, ReferenceComponent> = new Map();
   public readonly byIdentity: Map<string, ReferenceComponent> = new Map();
   public readonly byLayout: Map<string, ReferenceComponent> = new Map();
   public constructor(resources: SchemaResources) {
      this.resources = resources;
   }

   public load(): void {
      for (const file of this.resources.iterator()) {
         if (this.byFile.has(file)) continue;
         if (file.endsWith("Packet.json")) continue;
         this.file(file);
      }
   }

   public async dump(folder: string): Promise<void> {
      const enums = [];
      const structs = [];
      const unions = [];
      for (const file of this.byLayout.values()) {
         const type = file.getFileContent({}) as any;
         await writeFile(
            join(folder, file.name + ".json"),
            JSON.stringify(type, null, 2),
         );

         if (type.type === "enum") enums.push(type);
         if (type.type === "struct") structs.push(type);
         if (type.type === "union") unions.push(type);
      }

      await writeFile(
         join(folder, "__protocol__.json"),
         JSON.stringify(
            {
               name: "protocol",
               type: "namespace",
               enums: enums,
               structs: structs,
               unions: unions,
            },
            null,
            2,
         ),
      );
   }

   public create(context: Context): ReferenceComponent {
      const type = new ReferenceComponent(context.name);
      return type;
   }

   public file(file: string): ReferenceComponent {
      if (this.byFile.has(file)) return this.byFile.get(file)!;

      //const data = this.resources.get(file);
      const consumer = Consumer.create(this.resources.get(file));
      const context = new Context(this, file, null);
      const type = this.create(context);
      this.byFile.set(file, type);
      const file_component = new FileComponent();
      file_component.consume(context, consumer);
      context.name = file_component.name;
      type.set("file", file_component);
      type.set("name", file_component.name);

      let component = this.resolveDataComponent(context, consumer);
      type.set("data", component);

      component.consume(context, consumer);

      this.byLayout.set(component.getLayoutKey(), type);
      console.log("[" + type.name + "]", component.getLayoutKey());

      if (!consumer.getIsConsumed())
         throw new ReferenceError(
            "Consumer wasn't properly consumed: " +
               JSON.stringify(consumer.getMissingReport()),
         );

      return type;
   }

   public resolveDataComponent(
      context: Context,
      consumer: Consumer,
   ): BaseComponent {
      if (consumer.hasProperty<SchemaDefinition>("$ref")) {
         const file = consumer
            .getProperty<SchemaDefinition>("$ref")
            .extract("string");

         const type = this.file(this.resources.resolved(file));
         return type;
      }

      if (consumer.hasProperty<SchemaDefinition>("oneOf")) {
         return new UnionComponent();
      }
      // reference is not data component but is valid base component
      if (consumer.hasProperty<SchemaDefinition>("type")) {
         const kind = consumer
            .getProperty<SchemaDefinition>("type")
            .extract("string");

         if (consumer.hasProperty<SchemaDefinition>("enum"))
            return new EnumComponent();

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
                  return new HashMapComponent(null, null);
               }

               return new HashSetComponent(null);
            }
            return new StructComponent();
         }
         if (kind === "integer") return new IntegerComponent("i32");
         if (kind === "number") return new FloatComponent("f32");
         if (kind === "string") return new StringComponent();
         if (kind === "array") return new ArrayComponent(null);
         if (kind === "boolean") return new BooleanComponent();
         if (kind === "null") return new VoidDataComponent();

         throw new TypeError(
            "Can not resolve type at the moment, type: " +
               kind +
               " at: " +
               context.getPath(),
         );
      }

      if (consumer.hasProperty<SchemaDefinition>("description")) {
         const description = consumer
            .getProperty<SchemaDefinition>("description")
            .extract("string");
         if (description === "Dynamic value") return new DDUIDynamicValue();

         throw new TypeError(
            "Unknown build in type, description: " +
               description +
               " at: " +
               context.getPath(),
         );
      }
      return new NBTCComponent();
   }

   public registerNewType(
      type: DataComponent,
      name: string,
   ): ReferenceComponent {
      const key = type.getLayoutKey();
      if (this.byLayout.has(key)) return this.byLayout.get(key)!;

      const ref = new ReferenceComponent(name);
      ref.set("data", type);

      console.log("Registered New: " + name);
      this.byLayout.set(key, ref);
      return ref;
   }

   public static async from(dir: string): Promise<Transformer> {
      const resources = await SchemaResources.load(dir);
      return new Transformer(resources);
   }
}
