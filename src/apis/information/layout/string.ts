import { LAYOUT_KEYS } from "../../constants";
import type { SchemaDefinition } from "../../../types";
import type { Consumer } from "../../consumer";
import type { Context } from "../../context";
import { EncodingInformation, PrimitiveTypeInformation } from "../base";
import { IntegerEncodingInformation, IntegerInformation } from "./number";

export class StringInformation extends PrimitiveTypeInformation {
   public static readonly default: StringEncodingInformation;
   public static readonly STRING_LAYOUT_KEY = LAYOUT_KEYS.STRING;
   public constructor() {
      super("string");
   }
   public override getEncoding(): EncodingInformation {
      return new StringEncodingInformation(this);
   }
   public override getLayoutKey(): string {
      return StringInformation.STRING_LAYOUT_KEY;
   }
   public override consumeInternal(
      context: Context,
      consumer: Consumer,
   ): void {}
}

export class StringEncodingInformation extends EncodingInformation {
   public readonly length: IntegerEncodingInformation =
      new IntegerEncodingInformation(new IntegerInformation("i32"), "string");
   public override getEncodingData(data: object): void {
      Reflect.set(data, "length_encoding", this.length.createLayout());
   }
   public override getEncodingKey(): string {
      return this.length.getEncodingKey() + LAYOUT_KEYS.STRING;
   }
   public override consumeInternal(context: Context, consumer: Consumer): void {
      // Todo add to metadata, also is it encoding rule or is it core behavior of string?
      // even if it doesn't sounds like it, we should just validate it on serialization or deserialization pretty much
      const max_length = consumer
         .getProperty<SchemaDefinition>("maxLength")
         .extractOptional("number");

      const min_length = consumer
         .getProperty<SchemaDefinition>("minLength")
         .extractOptional("number");

      if (min_length) Reflect.set(this.metadata, "min_length", min_length);

      if (max_length) Reflect.set(this.metadata, "max_length", max_length);

      const pattern = consumer
         .getProperty<SchemaDefinition>("pattern")
         .extractOptional("string");

      if (pattern) Reflect.set(this.metadata, "pattern", pattern);
   }
}

Reflect.set(
   StringInformation,
   "default",
   new StringEncodingInformation(new StringInformation()),
);
