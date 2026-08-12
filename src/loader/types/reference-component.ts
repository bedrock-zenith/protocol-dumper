import { hash } from "../../utils";
import type { Consumer } from "../consumer";
import type { Context } from "../context";
import { BaseComponent } from "./base-component";
import type { EncodingComponent } from "./encoding-component";
import type { FileComponent } from "./file-component";

export class ReferenceComponent extends BaseComponent {
   public name: string;
   public constructor(name: string) {
      super();
      this.name = name;
   }
   public data: BaseComponent | null = null;
   public file: FileComponent | null = null;
   public override getTypeContent(input: object): object {
      return {
         name: this.name,
         is_bind_type: true,
      };
   }
   public override getFileContent(input: object): object {
      Reflect.set(input, "name", this.name);
      Reflect.set(input, "hash", hash(this.data!.getIdentityKey()));
      Reflect.set(input, "type", this.name);
      input = this.data!.getTypeContent(input);
      Reflect.set(input, "type", Reflect.get(input, "name"));
      Reflect.set(input, "name", this.name);
      Reflect.deleteProperty(input, "is_bind_type");
      return input;
   }
   public override getLayoutKey(): string {
      if (this.data === this) return this.name;
      return this.data!.getLayoutKey();
   }
   public override getIdentityKey(): string {
      if (this.data === this) return this.name;
      return this.data!.getIdentityKey();
   }
   public override process(context: Context, consumer: Consumer): void {
      // reference is always create and consumed by hand
   }
   public override getEncoding(): EncodingComponent | null {
      if (this.data === this) return null;
      return this.data!.getEncoding();
   }
}
