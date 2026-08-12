import type { Consumer } from './consumer';
import type { Transformer } from './transformer';
import { BaseComponent } from './types';
import { EnumComponent } from './types/enum-component';
import { StructComponent } from './types/struct-component';
import { UnionComponent } from './types/union-component';
import type { DataComponent } from './types/data-component';

export class Context {
    public name: string;
    public readonly parent: Context | null;
    public readonly transformer: Transformer;
    public constructor(transformer: Transformer, name: string, parent: Context | null = null) {
        this.name = name;
        this.parent = parent;
        this.transformer = transformer;
    }
    public chain(name: string): Context {
        return new Context(this.transformer, name, this);
    }
    public getPath(): string {
        return `${this.parent?.getPath() ?? '[root]'}.[${this.name.toSpacePascalCase().fixed()}]`;
    }
    public getFullName(): string {
        return `${this.parent?.getFullName() ?? ''} [${this.name}]`.toSpacePascalCase().fixed();
    }
    public child(name: string, consumer: Consumer, mode: 'consumeWithEncoding' | 'consume'): BaseComponent {
        const context = this.chain(name);
        let type: BaseComponent = this.transformer.resolveDataComponent(context, consumer);
        type = type.consume(context, consumer);
        if (this.parent && type.is(EnumComponent, StructComponent, UnionComponent)) {
            type = this.transformer.registerNewType(type as DataComponent, this.getFullName());
        }
        if (mode === 'consumeWithEncoding') type = type.withEncoding(context, consumer);

        return type;
    }
}
