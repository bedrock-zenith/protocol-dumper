import type { Consumer } from "./consumer";
import {
   BindTypeInformation,
   EncodingInformation,
   type LayoutInformation,
} from "./information/base";
import type { Transformer } from "./transformer";

export class Context {
   public readonly parent: Context | null;
   public readonly name: string;
   public readonly file: string | null;
   public readonly transformer: Transformer;
   private constructor(
      name: string,
      transformer: Transformer | null,
      parent: Context | null,
      file: string | null,
   ) {
      this.name = name;
      this.parent = parent;
      this.file = file;
      this.transformer = transformer!;
   }

   public static create(
      name: string,
      file: string,
      transformer: Transformer,
   ): Context {
      return new this(name, transformer, null, file);
   }

   public chain(name: string): Context {
      return new Context(name, this.transformer, this, null);
   }

   public child(
      name: string,
      consumer: Consumer,
   ): [LayoutInformation, Context] {
      const context = this.chain(name);
      const information = this.transformer.resolve(context, consumer);
      information.consume(context, consumer);
      if (information instanceof BindTypeInformation) {
         this.transformer.registerBindType(information);
      }

      return [information, context];
   }

   public childWithEncoding(
      name: string,
      consumer: Consumer,
   ): [EncodingInformation, Context] {
      const [information, context] = this.child(name, consumer);
      const encoding = information.getEncoding();
      encoding.consume(context, consumer);
      return [encoding, context];
   }

   public find(file: string): Context | null {
      if (this.file === file) return this;

      return this.parent?.find(file) ?? null;
   }

   public getFullName(): string {
      if (this.file) return this.name;
      return `${this.parent?.getFullName() ?? ""} ${this.name}`
         .toSpacePascalCase()
         .fixed();
   }

   public getFullPath(): string {
      return `${this.parent?.getFullPath() ?? ""} [${this.file ?? this.name}]`;
   }

   public throw(message: string): never {
      throw new ContextError(this, message);
   }
}

export class ContextError extends Error {
   public readonly path: string;
   //public readonly context: Context;
   public constructor(context: Context, message: string) {
      super(message);
      this.path = context.getFullName();
      //this.context = context;
   }
}
