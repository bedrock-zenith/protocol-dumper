import type { SchemaDefinition } from "../../types";
import type { Consumer } from "../consumer";
import type { Context } from "../context";
import type { BaseComponent } from "./base-component";
import { ComposedComponent } from "./composed-component";
import {
   IntegerEncodingComponent,
   type EncodingComponent,
} from "./encoding-component";

export class ArrayComponent extends ComposedComponent {
   public constructor(child: BaseComponent | null) {
      super("array", child);
   }
   public override process(context: Context, consumer: Consumer): void {
      //todo: save the encoding as well if possible
      const type = context.child(
         "#item",
         consumer.getProperty<SchemaDefinition>("items"),
         "consumeWithEncoding",
      );

      this.set("child", type);

      // todo: add vector if minItems === maxItems
      consumer.discardMany<SchemaDefinition>([
         "minItems",
         "maxItems",
         // Yo, Moojžank se se rozhodl omezit počet vlasností lol, W Možjank
         "maxProperties",
      ]);
   }
   public override getEncoding(): EncodingComponent | null {
      return new IntegerEncodingComponent("array", "u32");
   }
}
