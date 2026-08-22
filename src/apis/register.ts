import type { LayoutInformation } from "./information/base";

export class Register {
   public readonly byFile: Map<string, LayoutInformation> = new Map();
   public readonly byName: Map<string, LayoutInformation> = new Map();
   public readonly byKey: Map<string, LayoutInformation> = new Map();

   public mark(file: string, layout: LayoutInformation): void {
      if (this.byFile.has(file)) {
         throw new ReferenceError(
            "File with this name is already registered: " + file,
         );
      }

      this.byFile.set(file, layout);
   }
}
