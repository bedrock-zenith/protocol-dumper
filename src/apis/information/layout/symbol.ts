import { LAYOUT_KEYS } from "../../constants";
import {
   BindTypeInformation,
   EmptyEncodingInformation,
   EncodingInformation,
   LayoutInformation,
} from "../base";
import { type DataScope, KeyBuilder } from "../../base";

export class SymbolInformation extends BindTypeInformation {
   public static readonly SYMBOL_LAYOUT_KEY = LAYOUT_KEYS.SYMBOL;
   public override type: string = "symbol";
   public override getData(data: object, scope: DataScope): void {
      super.getData(data, scope);
   }
   public override getEncoding(): EncodingInformation {
      return new EmptyEncodingInformation(this);
   }
   public override consumeInternal(): void {}
}

export class AliasInformation extends BindTypeInformation {
   public readonly element: LayoutInformation;
   public constructor(name: string, ref: LayoutInformation) {
      super(name);
      this.element = ref;
   }
   public static readonly LAYOUT_KEY = LAYOUT_KEYS.ALIAS;
   public override type: string = "alias";
   public override getData(data: object, scope: DataScope): void {
      super.getData(data, scope);
      if (scope === "layout" || scope === "field")
         Reflect.set(
            data,
            "element_type",
            this.element.createData("reference"),
         );
   }
   public override getKey(builder: KeyBuilder, scope: DataScope): void {
      super.getKey(builder, scope);
      this.element.getKey(builder, scope);
   }
   public override getEncoding(): EncodingInformation {
      return this.element.getEncoding();
   }
   public override consumeInternal(): void {}
}
