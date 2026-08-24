import { SCHEMA_KEYS } from "./constants";
import type { SchemaDefinition } from "../types";
import type { Consumer } from "./consumer";
import type { Context } from "./context";

export abstract class CommonInformation {
   public readonly isFinalized: boolean = false;
   public readonly metadata: Record<string, unknown> = {};
   public readonly constrain: string | null = null;
   public abstract getTypeData(data: object): void;
   public abstract getTypeKey(): string;
   public abstract getLayoutData(data: object): void;
   public abstract getLayoutKey(): string;
   protected abstract consumeInternal(
      context: Context,
      consumer: Consumer,
   ): void;
   public consume(context: Context, consumer: Consumer): void {
      if (this.isFinalized) return;
      if (
         consumer.hasProperty<SchemaDefinition>(
            SCHEMA_KEYS.RUNTIME_CONSTRAINT_DESCRIPTION,
         )
      ) {
         Reflect.set(
            this.metadata,
            "constrain",
            consumer
               .getProperty<SchemaDefinition>(
                  SCHEMA_KEYS.RUNTIME_CONSTRAINT_DESCRIPTION,
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

   public createLayout(): object {
      const obj = Object.create(null);
      this.getLayoutData(obj);
      if (Reflect.ownKeys(this.metadata).length > 0) {
         Reflect.set(obj, "metadata", this.metadata);
      }
      return obj;
   }
   public createType(): object {
      const obj = Object.create(null);
      this.getTypeData(obj);
      return obj;
   }
}
