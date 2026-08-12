import type { SchemaDefinition } from "../../types";
import type { Consumer } from "../consumer";
import type { Context } from "../context";
import { BaseComponent } from "./base-component";
import { ComposedComponent } from "./composed-component";
import { DataComponent } from "./data-component";
import {
   IntegerEncodingComponent,
   type EncodingComponent,
} from "./encoding-component";

export class HashSetComponent extends ComposedComponent {
   public constructor(child: BaseComponent | null) {
      super("hash_set", child);
   }
   public override process(context: Context, consumer: Consumer): void {
      //todo: save the encoding as well if possible
      const type = context.child(
         "#additionalProperties",
         consumer.getProperty<SchemaDefinition>("additionalProperties"),
         "consumeWithEncoding",
      );

      this.set("child", type);

      // todo: add vector if minItems === maxItems
      consumer.discardMany<SchemaDefinition>([
         "minItems",
         "maxItems",
         "maxProperties",
      ]);
   }
   public override getEncoding(): EncodingComponent | null {
      return new IntegerEncodingComponent("array", "u32");
   }
}

export class HashMapComponent extends DataComponent {
   public readonly key!: BaseComponent;
   public readonly value!: BaseComponent;
   public constructor(key: BaseComponent | null, value: BaseComponent | null) {
      super("hash_map");
      if (key) this.key = key;
      if (value) this.value = value;
   }
   public override process(context: Context, consumer: Consumer): void {
      //todo: save the encoding as well if possible
      const ap = consumer.getProperty<SchemaDefinition>("additionalProperties");

      const pn = consumer.getProperty<SchemaDefinition>("propertyNames");
      if (pn.hasValue()) {
         const key = context.child("#key", pn, "consumeWithEncoding");

         const value = context.child("#value", ap, "consumeWithEncoding");

         this.set("key", key);
         this.set("value", value);
      } else {
         if (
            ap.getProperty<SchemaDefinition>("type").extract("string") !=
            "object"
         )
            throw new TypeError("Has to be object with key:value pair");
         const keyValue = ap.getProperty<SchemaDefinition>("properties");

         const key = context.child(
            "#key",
            keyValue.getProperty("key"),
            "consumeWithEncoding",
         );

         const value = context.child(
            "#value",
            keyValue.getProperty("value"),
            "consumeWithEncoding",
         );

         this.set("key", key);
         this.set("value", value);

         // as always tf is mojang doing bru, just tell me like why is it like that, its hardcoded or something but lets just ignore it in case
         ap.discardMany<SchemaDefinition>(["minimum", "maximum"]);
      }
      // todo: include this information somewhere
      consumer.discardMany<SchemaDefinition>(["maxProperties"]);
   }
   public override getEncoding(): EncodingComponent | null {
      return new IntegerEncodingComponent("array", "u32");
   }
}
