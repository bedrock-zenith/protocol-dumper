import {
   EmptyEncodingInformation,
   EncodingInformation,
   PrimitiveTypeInformation,
} from "../base";

export class VoidInformation extends PrimitiveTypeInformation {
   public static readonly VOID_LAYOUT_KEY = "%%VOID%%" as const;
   public constructor() {
      super("void");
   }
   public override getEncoding(): EncodingInformation {
      return new EmptyEncodingInformation(this);
   }
   public override getLayoutKey(): string {
      return VoidInformation.VOID_LAYOUT_KEY;
   }
   public override consumeInternal(): void {}
}
