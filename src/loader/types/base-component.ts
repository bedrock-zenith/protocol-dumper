import type { SchemaDefinition } from '../../types';
import type { Consumer } from '../consumer';
import type { Context } from '../context';
import type { EncodingComponent } from './encoding-component';

export abstract class BaseComponent {
    public readonly constrain: string | null = null;
    public static get identifier(): string {
        return this.name.toSpacePascalCase().replaceAll(' ', '_').toLowerCase();
    }
    public get identifier(): string {
        return (this.constructor as unknown as BaseComponent).identifier;
    }
    public abstract getTypeContent(input: object): object;
    public abstract getFileContent(input: object): object;
    public abstract getIdentityKey(): string;
    public abstract getLayoutKey(): string;

    protected abstract process(context: Context, consumer: Consumer): void;
    public consume(context: Context, consumer: Consumer): BaseComponent {
        if (consumer.hasValue())
            if (consumer.hasProperty<SchemaDefinition>('x-runtime-constraint-description')) {
                this.set(
                    'constrain',
                    consumer
                        .getProperty<SchemaDefinition>('x-runtime-constraint-description')
                        .extract('string')
                );
            }
        this.process(context, consumer);
        return this;
    }
    public withEncoding(context: Context, consumer: Consumer): BaseComponent {
        const v = this.consume(context, consumer);

        const encoding = v.getEncoding();
        if (encoding) {
            encoding.process(context, consumer);
            encoding.set('base', v);
            return encoding;
        }

        return v;
    }
    public set<K extends keyof this>(key: K, value: this[K]): boolean {
        return Reflect.set(this, key, value);
    }
    public is(...types: Array<new (...params: unknown[]) => BaseComponent>): boolean {
        return types.some((_) => this instanceof _);
    }

    public getEncoding(): EncodingComponent | null {
        return null;
    }
}
