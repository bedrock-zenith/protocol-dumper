import type { Consumer } from "../consumer";
import type { Context } from "../context";
import { DataComponent } from "./data-component";

export class NBTCComponent extends DataComponent {
   public constructor() {
      super("nbt_compound");
   }
   public override process(context: Context, consumer: Consumer): void {}
}

export class DDUIDynamicValue extends DataComponent {
   public constructor() {
      super("ddui_dynamic_value");
   }
   public override process(context: Context, consumer: Consumer): void {}
}
export class VoidDataComponent extends DataComponent {
   public constructor() {
      super("void");
   }
   public override process(context: Context, consumer: Consumer): void {}
}
