import { BaseComponent } from "./base-component";

export abstract class DataComponent extends BaseComponent {
   public readonly type: string;
   public constructor(type: string) {
      super();
      this.type = type;
   }
   public override getFileContent(input: object): object {
      return Object.assign(input, {
         name: this.type,
         is_bind_type: false,
      });
   }
   public override getTypeContent(input: object): object {
      return Object.assign(input, {
         name: this.type,
         is_bind_type: false,
      });
   }
   public override getIdentityKey(): string {
      return this.type;
   }
   public override getLayoutKey(): string {
      return this.type;
   }
}
