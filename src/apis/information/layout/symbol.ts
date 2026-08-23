import { LAYOUT_KEYS } from "../../constants";
import {
   BindTypeInformation,
   EmptyEncodingInformation,
   EncodingInformation,
   LayoutInformation,
} from "../base";

export class SymbolInformation extends BindTypeInformation {
   public static readonly SYMBOL_LAYOUT_KEY = LAYOUT_KEYS.SYMBOL;
   public override type: string = "symbol";
   public override getLayoutData(data: object): void {}
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
   public override getLayoutData(data: object): void {
      super.getLayoutData(data);
      Reflect.set(data, "element_type", this.element.createType());
   }
   public override getTypeKey(): string {
      return super.getTypeKey() + this.element.getTypeKey();
   }
   public override getLayoutKey(): string {
      return super.getLayoutKey() + this.element.getLayoutKey();
   }
   public override getEncoding(): EncodingInformation {
      return this.element.getEncoding();
   }
   public override consumeInternal(): void {}
}
