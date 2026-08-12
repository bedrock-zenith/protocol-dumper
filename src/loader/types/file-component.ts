import type { SchemaFileEntry } from "../../types";
import type { Consumer } from "../consumer";
import type { Context } from "../context";
import { BaseComponent } from "./base-component";

export class FileComponent extends BaseComponent {
   public override getTypeContent(input: object): object {
      return input;
   }
   public override getFileContent(input: object): object {
      Reflect.set(input, "name", this.name);
      return input;
   }
   public override getIdentityKey(): string {
      throw new Error("Method not implemented.");
   }
   public override getLayoutKey(): string {
      throw new Error("Method not implemented.");
   }
   public name!: string;
   public protocol!: number;
   public override process(context: Context, consumer: Consumer): void {
      consumer.discardMany<SchemaFileEntry>([
         "$id",
         "$schema",
         "x-format-version",
      ]);

      const {
         "x-protocol-version": _xProtocol,
         "x-minecraft-version": _xMinecraft,
         title,
      } = consumer.extractMany({
         "x-protocol-version": "number",
         "x-minecraft-version": "string",
         title: "string",
      } satisfies Partial<
         Record<keyof SchemaFileEntry, "number" | "string" | "boolean">
      >);

      this.set("name", title.toSpacePascalCase().fixed());
      this.set("protocol", _xProtocol);
   }
}
