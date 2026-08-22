import {
   FLOAT_MAP,
   INTEGER_MAP,
   type AheadOfTransformFloatType,
   type AheadOfTransformIntegerType,
   type CommonEncoding,
   type Float,
   type Integer,
   type IntegerEncoding,
} from "../../../definitions";
import type { SchemaDefinition } from "../../../types";
import type { Consumer } from "../../consumer";
import type { Context } from "../../context";
import { EncodingInformation, PrimitiveTypeInformation } from "../base";

export abstract class NumberInformation<
   T extends Float | Integer,
> extends PrimitiveTypeInformation {
   public readonly interpretation: T;
   public constructor(interpretation: T) {
      super(interpretation.startsWith("f") ? "float" : "integer");
      this.interpretation = interpretation;
   }

   public override getLayoutData(data: object): void {
      super.getLayoutData(data);
      Reflect.set(data, "interpretation", this.interpretation);
   }

   public override getLayoutKey(): string {
      return this.name + this.interpretation;
   }

   public override consumeInternal(context: Context, consumer: Consumer): void {
      if (consumer.hasProperty<SchemaDefinition>("x-underlying-type")) {
         const underlying = consumer
            .getProperty<SchemaDefinition>("x-underlying-type")
            .extract("string");

         const n = this.getNumber(underlying);
         if (!n)
            context.throw(
               `Unknown ${this.name} underlying type: ${underlying}`,
            );

         this.set("interpretation", n);
      }

      // todo: include if possible
      consumer.discardMany<SchemaDefinition>(["minimum", "maximum"]);
   }
   public abstract getNumber(underlying: string): T | null;
}

export abstract class NumberEncodingInformation<
   T extends Float | Integer,
> extends EncodingInformation {
   public readonly interpretation: T;
   public readonly encoding: T extends Float ? CommonEncoding : IntegerEncoding;
   public constructor(layout: NumberInformation<T>) {
      super(layout);
      this.interpretation = layout.interpretation;
      this.encoding = "little_endian";
   }

   public abstract getNumberEncoding(
      bits: EncodingBits,
   ): T extends Float ? CommonEncoding : IntegerEncoding;
   public override getEncodingData(data: object): void {
      Reflect.set(data, "reinterpret", this.interpretation);
      Reflect.set(data, "encoding", this.encoding);
   }

   public override getEncodingKey(): string {
      return this.interpretation + this.encoding;
   }
}

export class IntegerInformation extends NumberInformation<Integer> {
   public override getNumber(underlying: string): Integer | null {
      return INTEGER_MAP[underlying as AheadOfTransformIntegerType] ?? null;
   }
   public override getEncoding(): EncodingInformation {
      return new IntegerEncodingInformation(this, "integer");
   }
}

export class IntegerEncodingInformation extends NumberEncodingInformation<Integer> {
   public readonly scope: NumericScope;
   public constructor(layout: IntegerInformation, scope: NumericScope) {
      super(layout);
      this.scope = scope;
   }

   public override consumeInternal(context: Context, consumer: Consumer): void {
      const backing =
         consumer.getProperty<SchemaDefinition>("x-underlying-type");
      if (backing.hasValue()) {
         this.set("interpretation", Utils.integer(backing.extract("string")));
      }

      const options = consumer.getProperty<SchemaDefinition>(
         "x-serialization-options",
      );

      if (options.hasValue()) {
         // mojangs clusterfuck shi, let us hardcode this non-sense
         // wait, after some investigation looks like some of them are actually available just not properly linked or whatever
         if (
            [
               "Container Id",
               "M Stop Expression Version",
               "Container Type",
               "Input Data",
               "Player Permission Level",
               "Hud Element",
               "Filter Profanity Change",
            ].includes(context.name)
         ) {
            void options.extractIncludes("string", "Enum-as-Value");
         }

         const bits = Utils.getEncodingBits(options);
         this.set("encoding", this.getNumberEncoding(bits));
      }
   }

   public override getNumberEncoding(bits: EncodingBits): IntegerEncoding {
      if (Utils.isCompressed(bits, this.scope)) {
         return this.interpretation.startsWith("i") ? "zleb128" : "leb128";
      }

      return Utils.isLittleEndian(bits) ? "little_endian" : "big_endian";
   }
}

export class FloatInformation extends NumberInformation<Float> {
   public override getNumber(underlying: string): Float | null {
      return FLOAT_MAP[underlying as AheadOfTransformFloatType] ?? null;
   }
   public override getEncoding(): EncodingInformation {
      return new FloatEncodingInformation(this);
   }
}

export class FloatEncodingInformation extends NumberEncodingInformation<Float> {
   public override consumeInternal(context: Context, consumer: Consumer): void {
      const backing =
         consumer.getProperty<SchemaDefinition>("x-underlying-type");
      if (backing.hasValue()) {
         this.set("interpretation", Utils.float(backing.extract("string")));
      }

      const options = consumer.getProperty<SchemaDefinition>(
         "x-serialization-options",
      );
      if (options.hasValue()) {
         const bits = Utils.getEncodingBits(options);
         this.set("encoding", this.getNumberEncoding(bits));
      }
   }

   public override getNumberEncoding(bits: EncodingBits): CommonEncoding {
      // Should never ever happen
      if (Utils.isCompressed(bits, "float"))
         throw new ReferenceError(
            "Float can not be compressed with leb128 compression",
         );

      return Utils.isLittleEndian(bits) ? "little_endian" : "big_endian";
   }
}

export interface EncodingBits {
   hasCompressionBit: boolean;
   notCompressedBit: boolean;
   bigEndianBit: boolean;
   littleEndianBit: boolean;
}
export type NumericScope =
   "array" | "union" | "string" | "enum" | "integer" | "float";
export class Utils {
   private constructor() {}
   public static integer(raw: string): Integer {
      const type = INTEGER_MAP[raw as AheadOfTransformIntegerType];
      if (!type) throw new TypeError("Invalid integer type: " + raw);
      return type;
   }
   public static float(raw: string): Float {
      const type = FLOAT_MAP[raw as AheadOfTransformFloatType];
      if (!type) throw new TypeError("Invalid float type: " + raw);
      return type;
   }

   public static isCompressed(
      bits: EncodingBits,
      scope: NumericScope,
   ): boolean {
      if (scope === "array" || scope === "string" || scope === "union")
         // default true
         return !bits.notCompressedBit || bits.hasCompressionBit;
      if (scope === "enum" || scope === "integer")
         // default false
         return bits.hasCompressionBit && !bits.notCompressedBit;
      if (scope === "float")
         // default false
         return bits.hasCompressionBit && !bits.notCompressedBit;

      throw new ReferenceError("Unknown scope kind: " + scope);
   }

   public static getEncodingBits(options: Consumer): EncodingBits {
      const hasCompression = options.extractIncludes("string", "Compression");
      const notCompressed = options.extractIncludes(
         "string",
         "No size compression",
      );
      const bigEndian = options.extractIncludes("string", "Big Endian");
      const littleEndian = options.extractIncludes("string", "Little Endian");
      return {
         hasCompressionBit: hasCompression,
         notCompressedBit: notCompressed,
         bigEndianBit: bigEndian,
         littleEndianBit: littleEndian,
      };
   }

   public static isLittleEndian(bits: EncodingBits): boolean {
      return !bits.bigEndianBit || bits.littleEndianBit;
   }
}
