import { SCHEMA_KEYS } from './constants';
import type { SchemaDefinition } from '../types';
import type { Consumer } from './consumer';
import type { Context } from './context';

export type DataScope = 'layout' | 'field' | 'reference';

export class KeyBuilder {
    private readonly parts: string[] = [];

    public append(value: unknown): this {
        if (typeof value === 'object' && value !== null) {
            this.parts.push(JSON.stringify(value));
        } else {
            this.parts.push(String(value));
        }
        return this;
    }

    public finalize(): string {
        return this.parts.join('');
    }
}

export abstract class CommonInformation {
    public readonly isFinalized: boolean = false;
    public readonly metadata: Record<string, unknown> = {};
    public readonly constrain: string | null = null;
    public abstract getData(data: object, scope: DataScope): void;
    public abstract getKey(builder: KeyBuilder, scope: DataScope): void;
    protected abstract consumeInternal(context: Context, consumer: Consumer): void;
    public consume(context: Context, consumer: Consumer): void {
        if (this.isFinalized) return;
        if (consumer.hasProperty<SchemaDefinition>(SCHEMA_KEYS.RUNTIME_CONSTRAINT_DESCRIPTION)) {
            Reflect.set(
                this.metadata,
                'constrain',
                consumer
                    .getProperty<SchemaDefinition>(SCHEMA_KEYS.RUNTIME_CONSTRAINT_DESCRIPTION)
                    .extract('string')
            );
        }
        this.consumeInternal(context, consumer);
        this.set('isFinalized', true);
    }
    public set<K extends keyof this>(key: K, value: this[K]): boolean {
        return Reflect.set(this, key, value);
    }

    public createData(scope: DataScope): object {
        const obj = Object.create(null);
        this.getData(obj, scope);
        return obj;
    }

    public createLayout(): object {
        return this.createData('layout');
    }

    public createType(): object {
        return this.createData('field');
    }

    public createKey(scope: DataScope): string {
        const builder = new KeyBuilder();
        this.getKey(builder, scope);
        return builder.finalize();
    }
}
