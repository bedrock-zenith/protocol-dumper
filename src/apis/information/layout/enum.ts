import { SCHEMA_KEYS, SERIALIZATION_OPTIONS } from '../../constants';
import type { SchemaDefinition } from '../../../types';
import type { Consumer } from '../../consumer';
import type { Context } from '../../context';
import { BindTypeInformation, EncodingInformation } from '../base';
import { IntegerEncodingInformation, IntegerInformation } from './number';

export class EnumLayoutInformation extends BindTypeInformation {
    public override type: string = 'enum';
    public readonly fields: Record<string, number> = Object.create(null);
    public readonly backing: IntegerInformation | null = null;
    public readonly kind: 'numeric' | 'literal' = 'literal';
    public override consumeInternal(context: Context, consumer: Consumer): void {
        const enums = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.ENUM);
        let i = 0;
        for (const value of enums.getIterator()) this.fields[value.extract('string')] = i++;

        const enumType = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.TYPE).extract('string');

        if (enumType !== 'string') throw new TypeError('Unknown enum type: ' + enumType);

        const underlying = consumer
            .getProperty<SchemaDefinition>(SCHEMA_KEYS.UNDERLYING_TYPE)
            .extract('string');

        if (underlying === 'object') {
            this.set('kind', 'literal');
            this.set('backing', null);
        } else {
            this.set('kind', 'numeric');
            let backing = new IntegerInformation('u32');
            backing.consume(context, consumer);
            this.set('backing', backing);
        }
    }
    public override getLayoutData(data: object): void {
        super.getLayoutData(data);
        Reflect.set(data, 'enum_kind', this.kind);
        if (this.backing) Reflect.set(data, 'backing_integer', this.backing.interpretation);
        Reflect.set(data, 'enum', this.fields);
    }
    public override getTypeKey(): string {
        return super.getTypeKey() + JSON.stringify(this.fields) + this.backing?.getTypeKey() + this.kind;
    }
    public override getLayoutKey(): string {
        return super.getLayoutKey() + JSON.stringify(this.fields) + this.kind;
    }
    public override getEncoding(): EncodingInformation {
        return new EnumEncodingInformation(this);
    }
}

export class EnumEncodingInformation extends EncodingInformation {
    public readonly reinterpret: IntegerEncodingInformation | null;
    public readonly kind: 'numeric' | 'literal' = 'literal';
    public readonly exhaustive: 'non_exhaustive' | 'exhaustive' = 'exhaustive';
    public constructor(layout: EnumLayoutInformation) {
        super(layout);
        this.reinterpret = layout.backing ? new IntegerEncodingInformation(layout.backing, 'enum') : null;
    }
    public override getEncodingData(data: object): void {
        Reflect.set(data, 'exhaustive', this.exhaustive);
        Reflect.set(data, 'enum_encoding', this.kind);
        if (this.reinterpret) Reflect.set(data, 'data_encoding', this.reinterpret.createLayout());
    }
    public override getEncodingKey(): string {
        return this.kind + this.exhaustive + '#' + (this.reinterpret?.getEncodingKey() ?? '');
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {
        const options = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.SERIALIZATION_OPTIONS);

        if (options.hasValue()) {
            const enumAsValue = options.extractIncludes('string', SERIALIZATION_OPTIONS.ENUM_AS_VALUE);
            this.set('kind', enumAsValue ? 'numeric' : 'literal');
            if (enumAsValue) {
                const int = new IntegerInformation('i32');
                int.consume(context, consumer);
                const inte = int.getEncoding() as IntegerEncodingInformation;

                inte.consume(context, consumer);
                this.set('reinterpret', inte);
            }

            if (options.extractIncludes('string', SERIALIZATION_OPTIONS.ALLOW_UNKNOWN_ENUM_VALUES)) {
                this.set('exhaustive', 'non_exhaustive');
            }
        } else {
            consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.UNDERLYING_TYPE).discard();
            this.set('reinterpret', null);
            this.set('kind', 'literal');
        }
    }
}
