import type { SchemaDefinition } from "../../types";
import type { Consumer } from "../consumer";
import type { Context } from "../context";
import { DataComponent } from "./data-component";
import {
   EnumEncodingComponent,
   type EncodingComponent,
} from "./encoding-component";
import { IntegerComponent } from "./number-component";

export class EnumComponent extends DataComponent {
   public readonly fields: Record<string, number> = Object.create(null);
   public readonly backing: IntegerComponent | null = null;
   public readonly kind: "numeric" | "literal" = "literal";
   public constructor() {
      super("enum");
   }
   public override process(context: Context, consumer: Consumer): void {
      const enums = consumer.getProperty<SchemaDefinition>("enum");
      let i = 0;
      for (const value of enums.getIterator())
         this.fields[value.extract("string")] = i++;

      const enumType = consumer
         .getProperty<SchemaDefinition>("type")
         .extract("string");

      if (enumType !== "string")
         throw new TypeError("Unknown enum type: " + enumType);

      const underlying = consumer
         .getProperty<SchemaDefinition>("x-underlying-type")
         .extract("string");

      if (underlying === "object") {
         this.set("kind", "literal");
         this.set("backing", null);
      } else {
         this.set("kind", "numeric");
         let backing = new IntegerComponent("u32").consume(context, consumer);
         this.set("backing", backing as IntegerComponent);
      }
   }
   public override getFileContent(input: object): object {
      input = super.getFileContent(input);
      if (this.backing)
         Reflect.set(
            input,
            "backing",
            this.backing.getFileContent(Object.create(null)),
         );
      Reflect.set(input, "enum", this.fields);
      return input;
   }
   public override getTypeContent(input: object): object {
      input = super.getTypeContent(input);
      if (this.backing)
         Reflect.set(
            input,
            "backing",
            this.backing.getTypeContent(Object.create(null)),
         );
      Reflect.set(input, "enum", this.fields);
      return input;
   }
   public override getIdentityKey(): string {
      return (
         super.getIdentityKey() +
         JSON.stringify(this.fields) +
         (this.backing?.getIdentityKey() ?? "")
      );
   }
   public override getLayoutKey(): string {
      return (
         super.getLayoutKey() +
         JSON.stringify(this.fields) +
         (this.backing?.getLayoutKey() ?? "")
      );
   }
   public override getEncoding(): EncodingComponent | null {
      return new EnumEncodingComponent(this.backing?.number ?? "u32");
   }
}
