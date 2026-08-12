import type { Consumer } from "../consumer";
import type { Context } from "../context";
import type { BaseComponent } from "./base-component";
import { ComposedComponent } from "./composed-component";
export class OptionalComponent extends ComposedComponent {
   public constructor(child: BaseComponent) {
      super("optional", child);
   }
   public override process(context: Context, consumer: Consumer): void {
      throw new ReferenceError(
         "No implementation, this error should be unreachable",
      );
   }
}
