import { LAYOUT_KEYS } from "../constants";
import { CommonInformation, type DataScope, KeyBuilder } from "../base";
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
   public override getKey(builder: KeyBuilder, scope: DataScope): void {
      builder.append(this.type);
      builder.append(this.name);
   }
   public override getData(data: object, scope: DataScope): void {
      Reflect.set(data, "name", this.name);
      Reflect.set(data, "bind_type", this.type);
      Reflect.set(data, "is_bind_type", true);
      if (scope === "layout" && Reflect.ownKeys(this.metadata).length > 0)
         Reflect.set(data, "metadata", this.metadata);
   }

   public dump(): object {
      const obj = Object.create(null);
      Reflect.set(obj, "name", this.name);
      Reflect.set(obj, "hash", hash(this.createKey("layout")));
      Reflect.set(obj, "bind_type", this.type);
      Reflect.set(obj, "is_bind_type", true);
      this.getData(obj, "layout");
      return obj;
   }
}

export abstract class PrimitiveTypeInformation extends LayoutInformation {
   public override getData(data: object, scope: DataScope): void {
      Reflect.set(data, "name", this.name);
      Reflect.set(data, "is_bind_type", false);
      if (
         (scope === "layout" || scope === "field") &&
         Reflect.ownKeys(this.metadata).length > 0
      )
         Reflect.set(data, "metadata", this.metadata);
   }
   public override getKey(builder: KeyBuilder, scope: DataScope): void {
      void scope;
      builder.append(this.name);
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
   public override getData(data: object, scope: DataScope): void {
      this.layout.getData(data, scope);
      if (
         (scope === "layout" || scope === "field") &&
         Reflect.ownKeys(this.metadata).length > 0
      )
         Reflect.set(data, "metadata", this.metadata);
   }
   public override getKey(builder: KeyBuilder, scope: DataScope): void {
      this.layout.getKey(builder, scope);
   }
}

export class EmptyEncodingInformation extends EncodingInformation {
   public override getKey(builder: KeyBuilder, scope: DataScope): void {
      super.getKey(builder, scope);
      if (scope === "layout" || scope === "field")
         builder.append(LAYOUT_KEYS.EMPTY_ENCODING_INFORMATION);
   }
   public override consumeInternal(): void {}
}
