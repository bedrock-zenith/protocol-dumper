import { CommonInformation } from "../base";

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
      return this.type + this.name;
   }
   public override getTypeData(data: object): void {
      Reflect.set(data, "name", this.name);
      Reflect.set(data, "bind_type", this.type);
      Reflect.set(data, "is_bind_type", true);
   }
}

export abstract class PrimitiveTypeInformation extends LayoutInformation {
   public override getLayoutData(data: object): void {
      Reflect.set(data, "name", this.name);
      Reflect.set(data, "is_bind_type", false);
   }
   public override getTypeData(data: object): void {
      this.getLayoutData(data);
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
      return "%%EMPTY_ENCODING_INFORMATION%%";
   }
   public override consumeInternal(): void {}
}
