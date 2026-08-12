import type { Consumer } from "../consumer";
import type { Context } from "../context";
import { DataComponent } from "./data-component";
import {
   BooleanEncodingComponent,
   type EncodingComponent,
} from "./encoding-component";

export class BooleanComponent extends DataComponent {
   public constructor() {
      super("boolean");
   }
   public override process(context: Context, consumer: Consumer): void {
      //todo: include encoding in the future
   }
   public override getEncoding(): EncodingComponent | null {
      return new BooleanEncodingComponent();
   }
}
