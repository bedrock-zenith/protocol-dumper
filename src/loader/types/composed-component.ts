import type { BaseComponent } from "./base-component";
import { DataComponent } from "./data-component";

export abstract class ComposedComponent extends DataComponent {
   public readonly child: BaseComponent | null;
   public constructor(type: string, child: BaseComponent | null) {
      super(type);
      this.child = child;
   }
   public override getTypeContent(input: object): object {
      input = super.getTypeContent(input);
      Reflect.set(
         input,
         "child_element",
         this.child!.getTypeContent(Object.create(null)),
      );
      return input;
   }
   public override getFileContent(input: object): object {
      input = super.getFileContent(input);
      Reflect.set(
         input,
         "child_element",
         this.child!.getTypeContent(Object.create(null)),
      );
      return input;
   }
   public override getIdentityKey(): string {
      return super.getIdentityKey() + this.child!.getIdentityKey();
   }
   public override getLayoutKey(): string {
      return super.getLayoutKey() + this.child!.getLayoutKey();
   }
}
