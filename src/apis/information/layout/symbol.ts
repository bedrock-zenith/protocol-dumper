import {
   BindTypeInformation,
   EmptyEncodingInformation,
   EncodingInformation,
   LayoutInformation,
} from "../base";

export class SymbolInformation extends BindTypeInformation {
   public static readonly SYMBOL_LAYOUT_KEY = "%%SYMBOL%%" as const;
   public override type: string = "symbol";
   public override getLayoutData(data: object): void {}
   public override getEncoding(): EncodingInformation {
      return new EmptyEncodingInformation(this);
   }
   public override consumeInternal(): void {}
}

export class AliasInformation extends BindTypeInformation {
   public readonly ref: LayoutInformation;
   public constructor(name: string, ref: LayoutInformation) {
      super(name);
      this.ref = ref;
   }
   public static readonly LAYOUT_KEY = "%%ALIAS%%" as const;
   public override type: string = "alias";
   public override getLayoutData(data: object): void {
      this.ref.getLayoutData(data);
   }
   public override getEncoding(): EncodingInformation {
      return this.ref.getEncoding();
   }
   public override consumeInternal(): void {}
}
