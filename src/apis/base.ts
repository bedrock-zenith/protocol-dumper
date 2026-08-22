import type { SchemaDefinition } from "../types";
import type { Consumer } from "./consumer";
import type { Context } from "./context";

export abstract class CommonInformation {
   public readonly isFinalized: boolean = false;
   public readonly constrain: string | null = null;
   public abstract getTypeData(data: object): void;
   public abstract getLayoutData(data: object): void;
   public abstract getTypeKey(): string;
   public abstract getLayoutKey(): string;
   protected abstract consumeInternal(
      context: Context,
      consumer: Consumer,
   ): void;
   public consume(context: Context, consumer: Consumer): void {
      if (this.isFinalized) return;
      if (
         consumer.hasProperty<SchemaDefinition>(
            "x-runtime-constraint-description",
         )
      ) {
         this.set(
            "constrain",
            consumer
               .getProperty<SchemaDefinition>(
                  "x-runtime-constraint-description",
               )
               .extract("string"),
         );
      }
      this.consumeInternal(context, consumer);
      this.set("isFinalized", true);
   }
   public set<K extends keyof this>(key: K, value: this[K]): boolean {
      return Reflect.set(this, key, value);
   }
}
