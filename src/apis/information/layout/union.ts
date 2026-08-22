import type { SchemaDefinition, SchemaField } from "../../../types";
import type { Consumer } from "../../consumer";
import { Context } from "../../context";
import { BindTypeInformation, EncodingInformation } from "../base";
import type { EnumLayoutInformation } from "./enum";

export class UnionLayoutInformation extends BindTypeInformation {
   public readonly backing!: EnumLayoutInformation;
   public readonly map: Record<string, EncodingInformation> =
      Object.create(null);
   public override type: string = "map";

   public override getEncoding(): EncodingInformation {
      return new UnionEncodingInformation(this);
   }
   public override getLayoutData(data: object): void {
      throw new Error("Method not implemented.");
   }
   public override consumeInternal(context: Context, consumer: Consumer): void {
      const unionFields = consumer.getProperty<SchemaDefinition>("oneOf");

      const fields: EncodingInformation[] = [];
      for (const field of unionFields.getIterator()) {
         const type = context.childWithEncoding(String(fields.length), field);

         const ordinal = field.getProperty<SchemaField>("x-ordinal-index");
         if (ordinal.hasValue()) {
            const index = ordinal.extract("number");
            if (index !== fields.length)
               throw new ReferenceError(
                  "ordinal index has to mach its true index, did mojang fckp?",
               );
         }
         fields.push(type[0]);
      }
   }
}

export class UnionEncodingInformation extends EncodingInformation {
   public override getEncodingData(data: object): void {
      throw new Error("Method not implemented.");
   }
   public override getEncodingKey(): string {
      throw new Error("Method not implemented.");
   }
   protected override consumeInternal(
      context: Context,
      consumer: Consumer,
   ): void {
      consumer.discardMany(["x-control-value-type"]);
   }
}
