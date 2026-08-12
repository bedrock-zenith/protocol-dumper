import type { SchemaDefinition, SchemaField } from "../../types";
import type { Consumer } from "../consumer";
import type { Context } from "../context";
import { BaseComponent } from "./base-component";
import { DataComponent } from "./data-component";
import {
   StructEncodingComponent,
   type EncodingComponent,
} from "./encoding-component";
import { OptionalComponent } from "./optional-component";

export class StructComponent extends DataComponent {
   public readonly fields: FieldComponent[] = [];
   public constructor() {
      super("struct");
   }
   public override getTypeContent(input: object): object {
      input = super.getTypeContent(input);
      Reflect.set(
         input,
         "fields",
         this.fields.map((_) => _.getTypeContent(Object.create(null))),
      );
      return input;
   }
   public override getFileContent(input: object): object {
      input = super.getFileContent(input);
      Reflect.set(
         input,
         "fields",
         this.fields.map((_) => _.getTypeContent(Object.create(null))),
      );
      return input;
   }
   public override getIdentityKey(): string {
      return (
         super.getIdentityKey() +
         this.fields.map((_) => _.getIdentityKey()).join("")
      );
   }
   public override getLayoutKey(): string {
      return (
         super.getLayoutKey() +
         // Yes we want to change hash only by identity not layout
         this.fields.map((_) => _.getIdentityKey()).join("")
      );
   }
   public override process(context: Context, consumer: Consumer): void {
      const properties = consumer.getProperty<SchemaDefinition>("properties");
      if (!properties.hasValue()) {
         consumer.getProperty<SchemaDefinition>("required").discard();
         return;
      }

      const requires = consumer.getProperty<SchemaDefinition>("required");

      const keys = properties.getKeys();
      for (const key of keys) {
         const consumer = properties.getProperty(key);
         const c = context.chain(key);
         const field = new FieldComponent(key.toSpacePascalCase().fixed());
         field.process(c, consumer);

         const index = consumer
            .getProperty<SchemaField>("x-ordinal-index")
            .extract("number");

         if (!requires.hasValue() || !requires.extractIncludes("string", key)) {
            field.set("child", new OptionalComponent(field.child));
         }

         this.fields[index] = field;
      }
   }
   public override getEncoding(): EncodingComponent | null {
      return new StructEncodingComponent();
   }
}

export class FieldComponent extends BaseComponent {
   public readonly name: string;
   public readonly isConstant: boolean;
   public readonly child!: BaseComponent;
   public constructor(name: string) {
      super();
      this.name = name;
      this.isConstant = false;
   }
   public override process(context: Context, consumer: Consumer): void {
      if (consumer.hasProperty<SchemaField>("const")) {
         consumer.getProperty<SchemaField>("const").discard();
         this.set("isConstant", true);
      }

      consumer.getProperty<SchemaField>("default").discard();

      const type = context.child(this.name, consumer, "consumeWithEncoding");
      this.set("child", type);
   }
   public override getFileContent(input: object): object {
      Reflect.set(input, "field_name", this.name);
      Reflect.set(
         input,
         "field_type",
         this.child.getFileContent(Object.create(null)),
      );
      return input;
   }
   public override getTypeContent(input: object): object {
      Reflect.set(input, "field_name", this.name);
      Reflect.set(
         input,
         "field_type",
         this.child.getTypeContent(Object.create(null)),
      );
      return input;
   }
   public override getIdentityKey(): string {
      return this.child.getIdentityKey() + this.name;
   }
   public override getLayoutKey(): string {
      return this.child.getLayoutKey() + this.name;
   }
}
