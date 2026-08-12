export type ConsumerMap = {
   string: string;
   number: number;
   boolean: boolean;
   object: object;
   array: Array<any>;
   null: null;
};
export type ConsumerKey = keyof ConsumerMap;
export type PrimitiveKey = "string" | "number" | "boolean";

export class Consumer {
   public readonly type: ConsumerKey;
   public readonly data: any;
   private isConsumed: boolean;
   public constructor(data: any) {
      this.data = data;
      this.type = new.target.typeOf(data);
      this.isConsumed = this.type === "null";
   }

   protected getValue<K extends PrimitiveKey>(key: K): ConsumerMap[K] {
      this.assert(key);
      return this.data as ConsumerMap[K];
   }

   public extract<K extends PrimitiveKey>(key: K): ConsumerMap[K] {
      this.assert(key);
      this.isConsumed = true;
      return this.data as ConsumerMap[K];
   }

   public extractIncludes<K extends PrimitiveKey>(
      key: K,
      value: ConsumerMap[K],
   ): boolean {
      return (this.data as Array<Consumer>).some((_) => {
         if (_.type === key && _.getValue(key) === value)
            return (_.extract(key), true);
         return false;
      });
   }

   public hasValue(): boolean {
      return this.type !== "null";
   }

   public extractOptional<K extends "string" | "boolean" | "number">(
      key: K,
   ): ConsumerMap[K] | null {
      if (this.type === "null") return null;
      return this.extract(key);
   }

   public discard(): boolean {
      const discarded = !this.getIsConsumed();
      this.isConsumed = true;
      return discarded;
   }

   public expect(): this {
      if (this.type === null)
         throw new ReferenceError("Nullable is not expected");
      return this;
   }

   public getKeys(): string[] {
      if (this.type === "null") return [];
      this.assert("object");
      return Reflect.ownKeys(this.data)
         .filter(
            (_) =>
               typeof _ === "string" &&
               !(this.data[_] as Consumer).getIsConsumed(),
         )
         .map(String);
   }

   public hasProperty<T>(key: keyof T): boolean {
      return key in this.data;
   }

   public getProperty<T>(key: keyof T): Consumer {
      if (this.type === null) return new Consumer(null);
      this.assert("object");
      const consumer: Consumer | null = this.data[key] ?? null;
      if (consumer === null) return new Consumer(null);

      return consumer;
   }

   public extractMany<
      T extends Record<string, "string" | "boolean" | "number">,
   >(map: T): { [K in keyof T]: ConsumerMap[T[K]] } {
      const record: Record<string, any> = {};
      for (const key of Object.getOwnPropertyNames(map)) {
         record[key] = this.getProperty(key).extract(map[key as keyof T]);
      }

      return record as any;
   }

   public extractManyOptional<
      T extends Record<string, "string" | "boolean" | "number">,
   >(map: T): { [K in keyof T]: ConsumerMap[T[K]] | null } {
      const record: Record<string, any> = {};
      for (const key of Object.getOwnPropertyNames(map)) {
         record[key] = this.getProperty(key).extractOptional(
            map[key as keyof T],
         );
      }

      return record as any;
   }

   public discardMany<T = any>(keys: (keyof T)[]): void {
      for (const key of keys) this.getProperty(key).discard();
   }

   public getIterator(): IterableIterator<Consumer> {
      if (this.type === null) return [].values();
      this.assert("array");
      return (this.data as Array<Consumer>).values();
   }

   protected assert(type: ConsumerKey): void {
      if (this.type != type)
         throw new TypeError(`Expected ${type}, got ${this.type}`);
   }

   public static typeOf(data: any): ConsumerKey {
      switch (typeof data) {
         case "number":
         case "boolean":
         case "string":
            return typeof data as "string";

         case "undefined":
            return "null";
         case "object": {
            if (!data) return "null";

            return Array.isArray(data) ? "array" : "object";
         }

         case "bigint":
         case "function":
         case "symbol":
         default:
            throw new TypeError("Invalid consumer type: " + typeof data);
      }
   }

   public getIsConsumed(): boolean {
      return (
         this.isConsumed ||
         (this.type === "object" && this.getKeys().length === 0) ||
         (this.type === "array" &&
            !(this.data as Array<Consumer>).some((_) => !_.getIsConsumed()))
      );
   }

   public static create(data: any): Consumer {
      const type = Consumer.typeOf(data);
      switch (type) {
         case "string":
         case "number":
         case "boolean":
            return new Consumer(data);
         case "array":
            return new Consumer(data.map(Consumer.create));
         case "object":
            return new Consumer(
               Object.fromEntries(
                  Object.entries(data).map((_) => [
                     _[0],
                     Consumer.create(_[1]),
                  ]),
               ),
            );
         case "null":
            return new Consumer(null);
      }
   }
   public getMissingReport(): any | null {
      if (this.getIsConsumed()) return null;
      if (this.type === "object") {
         return Object.fromEntries(
            Object.entries(this.data)
               .filter((_) => !(_[1] as Consumer).getIsConsumed())
               .map(([key, value]) => [
                  key,
                  (value as Consumer).getMissingReport(),
               ]),
         );
      }
      if (this.type === "array")
         return (this.data as Array<Consumer>)
            .filter((_) => !_.getIsConsumed())
            .map((_) => _.getMissingReport());

      return this.data;
   }
}
