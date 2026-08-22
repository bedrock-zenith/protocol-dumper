import type { SchemaDefinition } from "../../../types";
import type { Consumer } from "../../consumer";
import type { Context } from "../../context";
import { BindTypeInformation, EncodingInformation } from "../base";
import { IntegerEncodingInformation, IntegerInformation } from "./number";

export class EnumLayoutInformation extends BindTypeInformation {
   public override type: string = "enum";
   public readonly fields: Record<string, number> = Object.create(null);
   public readonly backing: IntegerInformation | null = null;
   public readonly kind: "numeric" | "literal" = "literal";
   public constructor() {
      super("enum");
   }
   public override consumeInternal(context: Context, consumer: Consumer): void {
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
         let backing = new IntegerInformation("u32");
         backing.consume(context, consumer);
         this.set("backing", backing);
      }
   }
   public override getLayoutData(data: object): void {
      throw new Error("Method not implemented.");
   }
   public override getEncoding(): EncodingInformation {
      return new EnumEncodingInformation(this);
   }
}

export class EnumEncodingInformation extends EncodingInformation {
   public readonly reinterpret: IntegerEncodingInformation | null;
   public readonly kind: "numeric" | "literal" = "literal";
   public readonly exhaustive: "non_exhaustive" | "exhaustive" = "exhaustive";
   public constructor(layout: EnumLayoutInformation) {
      super(layout);
      this.reinterpret = layout.backing
         ? new IntegerEncodingInformation(layout.backing, "enum")
         : null;
   }
   public override getEncodingData(data: object): void {
      throw new Error("Method not implemented.");
   }
   public override getEncodingKey(): string {
      throw new Error("Method not implemented.");
   }
   public override consumeInternal(context: Context, consumer: Consumer): void {
      const options = consumer.getProperty<SchemaDefinition>(
         "x-serialization-options",
      );

      if (options.hasValue()) {
         const enumAsValue = options.extractIncludes("string", "Enum-as-Value");
         this.set("kind", enumAsValue ? "numeric" : "literal");
         if (enumAsValue) {
            const int = new IntegerInformation("i32");
            int.consume(context, consumer);
            const inte = int.getEncoding() as IntegerEncodingInformation;

            inte.consume(context, consumer);
            this.set("reinterpret", inte);
         }

         if (options.extractIncludes("string", "Allow unknown enum values")) {
            this.set("exhaustive", "non_exhaustive");
         }
      } else {
         // Who tf cares about the number, but mojang surely does, even if they serialize it as string anyway :|
         consumer.getProperty<SchemaDefinition>("x-underlying-type").discard();
         this.set("reinterpret", null);
         this.set("kind", "literal");
      }
   }
}
