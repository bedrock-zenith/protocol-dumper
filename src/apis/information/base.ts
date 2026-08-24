import { LAYOUT_KEYS } from "../constants";
import { CommonInformation } from "../base";
import { hash } from "../../utils";

export abstract class LayoutInformation extends CommonInformation {
   public readonly encodings: EncodingInformation[] = [];
   public readonly name: string;
   public constructor(name: string) {
      super();
      this.name = name;
   }
   public abstract getEncoding(): EncodingInformation;
}

export abstract class BindTypeInformation extends LayoutInformation {
   public abstract readonly type: string;
   public override getTypeKey(): string {
      return this.type + this.name;
   }
   public override getLayoutKey(): string {
      return this.type;
   }
   public override getTypeData(data: object): void {
      Reflect.set(data, "name", this.name);
      Reflect.set(data, "bind_type", this.type);
      Reflect.set(data, "is_bind_type", true);
   }
   public override getLayoutData(data: object): void {
      Reflect.set(data, "name", this.name);
      Reflect.set(data, "bind_type", this.type);
      Reflect.set(data, "is_bind_type", true);
   }

   public dump(): object {
      const obj = Object.create(null);
      Reflect.set(obj, "name", this.name);
      Reflect.set(obj, "hash", hash(this.getLayoutKey()));
      Reflect.set(obj, "bind_type", this.type);
      Reflect.set(obj, "is_bind_type", true);
      this.getLayoutData(obj);
      return obj;
   }
}

export abstract class PrimitiveTypeInformation extends LayoutInformation {
   public override getLayoutData(data: object): void {
      Reflect.set(data, "name", this.name);
      Reflect.set(data, "is_bind_type", false);
   }
   public override getTypeData(data: object): void {
      this.getLayoutData(data);
      if (Reflect.ownKeys(this.metadata).length > 0) {
         Reflect.set(data, "metadata", this.metadata);
      }
   }
   public override getTypeKey(): string {
      return this.getLayoutKey();
   }
}

/////////// ENCODING ////////////
export abstract class EncodingInformation extends CommonInformation {
   public readonly layout: LayoutInformation;
   public constructor(layout: LayoutInformation) {
      super();
      this.layout = layout;
      layout.encodings.push(this);
   }
   public override getLayoutData(data: object): void {
      this.layout.getLayoutData(data);
      this.getEncodingData(data);
   }
   public override getTypeData(data: object): void {
      this.layout.getTypeData(data);
      if (Reflect.ownKeys(this.metadata).length > 0) {
         Reflect.set(data, "metadata", this.metadata);
      }
      this.getEncodingData(data);
   }
   public override getLayoutKey(): string {
      return this.layout.getLayoutKey() + this.getEncodingKey();
   }
   public override getTypeKey(): string {
      return this.layout.getTypeKey();
   }
   public abstract getEncodingData(data: object): void;
   public abstract getEncodingKey(): string;
}

export class EmptyEncodingInformation extends EncodingInformation {
   public override getEncodingData(data: object): void {
      void data;
   }
   public override getEncodingKey(): string {
      return LAYOUT_KEYS.EMPTY_ENCODING_INFORMATION;
   }
   public override consumeInternal(): void {}
}
