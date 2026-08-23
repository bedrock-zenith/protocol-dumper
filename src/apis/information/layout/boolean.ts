import { BOOLEAN_SPECIAL_CASES, LAYOUT_KEYS, SCHEMA_KEYS, SERIALIZATION_OPTIONS } from '../../constants';
import type { SchemaDefinition } from '../../../types';
import type { Consumer } from '../../consumer';
import type { Context } from '../../context';
import { EncodingInformation, PrimitiveTypeInformation } from '../base';

export class BooleanInformation extends PrimitiveTypeInformation {
    public static readonly BOOLEAN_LAYOUT_KEY = LAYOUT_KEYS.BOOLEAN;
    public constructor() {
        super('boolean');
    }
    public override getEncoding(): EncodingInformation {
        return new BooleanEncodingInformation(this);
    }
    public override getLayoutKey(): string {
        return BooleanInformation.BOOLEAN_LAYOUT_KEY;
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {}
}

export class BooleanEncodingInformation extends EncodingInformation {
    public encoding: 'bool' = 'bool' as const;
    public override getEncodingData(data: object): void {
        Reflect.set(data, 'data_encoding', this.encoding);
    }
    public override getEncodingKey(): string {
        return this.encoding;
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {
        const backing = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.UNDERLYING_TYPE);
        if (backing.hasValue()) {
            if (backing.extract('string') !== 'boolean')
                context.throw('Unknown underlying type for boolean: ' + backing.extract('string'));
            this.set('encoding', 'bool');
        }

        if (BOOLEAN_SPECIAL_CASES.includes(context.name as (typeof BOOLEAN_SPECIAL_CASES)[number]))
            if (consumer.hasProperty(SCHEMA_KEYS.SERIALIZATION_OPTIONS)) {
                // hardcoded case
                consumer
                    .getProperty(SCHEMA_KEYS.SERIALIZATION_OPTIONS)
                    .extractIncludes('string', SERIALIZATION_OPTIONS.COMPRESSION);
            }

        // hardcoded case
        if (context.name === BOOLEAN_SPECIAL_CASES[3])
            consumer
                .getProperty(SCHEMA_KEYS.SERIALIZATION_OPTIONS)
                .extractIncludes('string', SERIALIZATION_OPTIONS.ENUM_AS_VALUE);
    }
}
