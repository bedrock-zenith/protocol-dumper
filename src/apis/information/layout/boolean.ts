import type { SchemaDefinition } from "../../../types";
import type { Consumer } from "../../consumer";
import type { Context } from "../../context";
import { EncodingInformation, PrimitiveTypeInformation } from "../base";

export class BooleanInformation extends PrimitiveTypeInformation {
   public static readonly BOOLEAN_LAYOUT_KEY = "%%BOOLEAN%%" as const;
   public constructor() {
      super("boolean");
   }
   public override getEncoding(): EncodingInformation {
      return new BooleanEncodingInformation(this);
   }
   public override getLayoutKey(): string {
      return BooleanInformation.BOOLEAN_LAYOUT_KEY;
   }
   public override consumeInternal(
      context: Context,
      consumer: Consumer,
   ): void {}
}

export class BooleanEncodingInformation extends EncodingInformation {
   public encoding: "bool" = "bool" as const;
   public override getEncodingData(data: object): void {
      super.getLayoutData(data);
   }
   public override getEncodingKey(): string {
      return this.encoding;
   }
   public override consumeInternal(context: Context, consumer: Consumer): void {
      const backing =
         consumer.getProperty<SchemaDefinition>("x-underlying-type");
      if (backing.hasValue()) {
         if (backing.extract("string") !== "boolean")
            context.throw(
               "Unknown underlying type for boolean: " +
                  backing.extract("string"),
            );
         this.set("encoding", "bool");
      }

      if (
         ["Died In Raid", "Success", "Was Targeting Bartering Player"].includes(
            context.name,
         )
      )
         if (consumer.hasProperty("x-serialization-options")) {
            // hardcoded case
            consumer
               .getProperty("x-serialization-options")
               .extractIncludes("string", "Compression");
         }

      // hardcoded case
      if (context.name === "Filter Profanity Change")
         consumer
            .getProperty("x-serialization-options")
            .extractIncludes("string", "Enum-as-Value");
   }
}
