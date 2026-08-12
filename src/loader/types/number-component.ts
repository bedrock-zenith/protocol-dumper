import {
   FLOAT_MAP,
   INTEGER_MAP,
   type AheadOfTransformFloatType,
   type AheadOfTransformIntegerType,
   type Float,
   type Integer,
} from "../../definitions";
import type { SchemaDefinition } from "../../types";
import type { Consumer } from "../consumer";
import type { Context } from "../context";
import { DataComponent } from "./data-component";
import {
   FloatEncodingComponent,
   IntegerEncodingComponent,
   type EncodingComponent,
} from "./encoding-component";

export abstract class NumberComponent<
   T extends Integer | Float,
> extends DataComponent {
   public readonly number: T;
   public constructor(number: T) {
      super(number.startsWith("f") ? "float" : "integer");
      this.number = number;
   }
   public override getTypeContent(input: object): object {
      input = super.getTypeContent(input);
      Reflect.set(input, "layout", String(this.number));
      return input;
   }
   public override getFileContent(input: object): object {
      input = super.getFileContent(input);
      Reflect.set(input, "layout", String(this.number));
      return input;
   }
   public override getIdentityKey(): string {
      return super.getIdentityKey() + this.number;
   }
   public override getLayoutKey(): string {
      return super.getLayoutKey() + this.number;
   }
   public abstract getNumber(underlying: string): T | null;

   public override process(context: Context, consumer: Consumer): void {
      if (consumer.hasProperty<SchemaDefinition>("x-underlying-type")) {
         const underlying = consumer
            .getProperty<SchemaDefinition>("x-underlying-type")
            .extract("string");

         const n = this.getNumber(underlying);
         if (!n)
            throw new TypeError(
               `Unknown ${this.type} underlying type: ${underlying}`,
            );

         this.set("number", n);
      }

      // todo: include if possible
      consumer.discardMany<SchemaDefinition>(["minimum", "maximum"]);
   }

   public override getEncoding(): EncodingComponent | null {
      if (this.type === "integer")
         return new IntegerEncodingComponent("integer", this.number as Integer);
      else return new FloatEncodingComponent("little_endian");
   }
}

export class IntegerComponent extends NumberComponent<Integer> {
   public override getNumber(underlying: string): Integer | null {
      return INTEGER_MAP[underlying as AheadOfTransformIntegerType] ?? null;
   }
}
export class FloatComponent extends NumberComponent<Float> {
   public override getNumber(underlying: string): Float | null {
      return FLOAT_MAP[underlying as AheadOfTransformFloatType] ?? null;
   }
}
