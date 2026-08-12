import type { SchemaDefinition, SchemaField } from "../../types";
import type { Consumer } from "../consumer";
import type { Context } from "../context";
import { BaseComponent } from "./base-component";
import { DataComponent } from "./data-component";
import {
   UnionEncodingComponent,
   type EncodingComponent,
} from "./encoding-component";

export class UnionComponent extends DataComponent {
   public readonly fields: BaseComponent[] = [];
   public constructor() {
      super("union");
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
         super.getIdentityKey() + this.fields.map((_) => _.getIdentityKey())
      );
   }
   public override getLayoutKey(): string {
      return super.getLayoutKey() + this.fields.map((_) => _.getIdentityKey());
   }
   public override process(context: Context, consumer: Consumer): void {
      const unionFields = consumer.getProperty<SchemaDefinition>("oneOf");

      const fields: BaseComponent[] = [];
      for (const field of unionFields.getIterator()) {
         const type = context.child(
            String(fields.length),
            field,
            "consumeWithEncoding",
         );

         const ordinal = field.getProperty<SchemaField>("x-ordinal-index");
         if (ordinal.hasValue()) {
            const index = ordinal.extract("number");
            if (index !== fields.length)
               throw new ReferenceError(
                  "ordinal index has to mach its true index, did mojang fckp?",
               );
         }
         fields.push(type);
      }

      this.set("fields", fields);
   }
   public override getEncoding(): EncodingComponent | null {
      return new UnionEncodingComponent();
   }
}
