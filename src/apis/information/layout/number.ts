import {
    FLOAT_MAP,
    INTEGER_MAP,
    type AheadOfTransformFloatType,
    type AheadOfTransformIntegerType,
    type CommonEncoding,
    type Float,
    type Integer,
    type IntegerEncoding
} from '../../../definitions';
import { INTEGER_SPECIAL_CASES, NUMERIC_SCOPES, SCHEMA_KEYS, SERIALIZATION_OPTIONS } from '../../constants';
import type { SchemaDefinition } from '../../../types';
import type { Consumer } from '../../consumer';
import type { Context } from '../../context';
import { EncodingInformation, PrimitiveTypeInformation } from '../base';
import { type DataScope, KeyBuilder } from '../../base';

export abstract class NumberInformation<T extends Float | Integer> extends PrimitiveTypeInformation {
    public readonly interpretation: T;
    public constructor(interpretation: T) {
        super(interpretation.startsWith('f') ? 'float' : 'integer');
        this.interpretation = interpretation;
    }

    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);
        Reflect.set(data, 'interpretation', this.interpretation);
    }

    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        void scope;
        builder.append(this.name).append(this.interpretation);
    }

    public override consumeInternal(context: Context, consumer: Consumer): void {
        if (consumer.hasProperty<SchemaDefinition>(SCHEMA_KEYS.UNDERLYING_TYPE)) {
            const underlying = consumer
                .getProperty<SchemaDefinition>(SCHEMA_KEYS.UNDERLYING_TYPE)
                .extract('string');

            const n = this.getNumber(underlying);
            if (!n) context.throw(`Unknown ${this.name} underlying type: ${underlying}`);

            this.set('interpretation', n);
        }
    }
    public abstract getNumber(underlying: string): T | null;
}

export abstract class NumberEncodingInformation<T extends Float | Integer> extends EncodingInformation {
    public readonly interpretation: T;
    public readonly encoding: T extends Float ? CommonEncoding : IntegerEncoding;
    public constructor(layout: NumberInformation<T>) {
        super(layout);
        this.interpretation = layout.interpretation;
        this.encoding = 'little_endian';
    }

    public abstract getNumberEncoding(bits: EncodingBits): T extends Float ? CommonEncoding : IntegerEncoding;
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);
        if (scope === 'layout' || scope === 'field') {
            Reflect.set(data, 'reinterpret', this.interpretation);

            Reflect.set(data, 'data_encoding', this.encoding);
        }
    }

    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        super.getKey(builder, scope);
        if (scope === 'layout' || scope === 'field')
            builder.append(this.interpretation).append(this.encoding);
    }

    public override consumeInternal(context: Context, consumer: Consumer): void {
        const minimum = consumer.getProperty<SchemaDefinition>('minimum');
        const maximum = consumer.getProperty<SchemaDefinition>('maximum');

        if (minimum.hasValue()) Reflect.set(this.metadata, 'min_value', minimum.extract('number'));

        if (maximum.hasValue()) Reflect.set(this.metadata, 'max_value', maximum.extract('number'));
    }
}

export class IntegerInformation extends NumberInformation<Integer> {
    public override getNumber(underlying: string): Integer | null {
        return INTEGER_MAP[underlying as AheadOfTransformIntegerType] ?? null;
    }
    public override getEncoding(): EncodingInformation {
        return new IntegerEncodingInformation(this, 'integer');
    }
}

export class IntegerEncodingInformation extends NumberEncodingInformation<Integer> {
    public readonly scope: NumericScope;
    public constructor(layout: IntegerInformation, scope: NumericScope) {
        super(layout);
        this.scope = scope;
        this.set(
            'encoding',
            this.getNumberEncoding({
                bigEndianBit: false,
                hasCompressionBit: false,
                littleEndianBit: false,
                notCompressedBit: false
            })
        );
    }

    public override consumeInternal(context: Context, consumer: Consumer): void {
        super.consumeInternal(context, consumer);
        const backing = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.UNDERLYING_TYPE);
        if (backing.hasValue()) {
            this.set('interpretation', Utils.integer(backing.extract('string')));
        }

        const options = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.SERIALIZATION_OPTIONS);

        if (options.hasValue()) {
            if (INTEGER_SPECIAL_CASES.includes(context.name as (typeof INTEGER_SPECIAL_CASES)[number])) {
                void options.extractIncludes('string', SERIALIZATION_OPTIONS.ENUM_AS_VALUE);
            }

            const bits = Utils.getEncodingBits(options);
            this.set('encoding', this.getNumberEncoding(bits));
        }
    }

    public override getNumberEncoding(bits: EncodingBits): IntegerEncoding {
        if (Utils.isCompressed(bits, this.scope)) {
            return this.interpretation.startsWith('i') ? 'zleb128' : 'leb128';
        }

        return Utils.isLittleEndian(bits) ? 'little_endian' : 'big_endian';
    }
}

export class FloatInformation extends NumberInformation<Float> {
    public override getNumber(underlying: string): Float | null {
        return FLOAT_MAP[underlying as AheadOfTransformFloatType] ?? null;
    }
    public override getEncoding(): EncodingInformation {
        return new FloatEncodingInformation(this);
    }
}

export class FloatEncodingInformation extends NumberEncodingInformation<Float> {
    public override consumeInternal(context: Context, consumer: Consumer): void {
        super.consumeInternal(context, consumer);
        const backing = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.UNDERLYING_TYPE);
        if (backing.hasValue()) {
            this.set('interpretation', Utils.float(backing.extract('string')));
        }

        const options = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.SERIALIZATION_OPTIONS);
        if (options.hasValue()) {
            const bits = Utils.getEncodingBits(options);
            this.set('encoding', this.getNumberEncoding(bits));
        }
    }

    public override getNumberEncoding(bits: EncodingBits): CommonEncoding {
        // Should never ever happen
        if (Utils.isCompressed(bits, 'float'))
            throw new ReferenceError('Float can not be compressed with leb128 compression');

        return Utils.isLittleEndian(bits) ? 'little_endian' : 'big_endian';
    }
}

export interface EncodingBits {
    hasCompressionBit: boolean;
    notCompressedBit: boolean;
    bigEndianBit: boolean;
    littleEndianBit: boolean;
}
export type NumericScope = 'array' | 'union' | 'string' | 'enum' | 'integer' | 'float';
export class Utils {
    private constructor() {}
    public static integer(raw: string): Integer {
        const type = INTEGER_MAP[raw as AheadOfTransformIntegerType];
        if (!type) throw new TypeError('Invalid integer type: ' + raw);
        return type;
    }
    public static float(raw: string): Float {
        const type = FLOAT_MAP[raw as AheadOfTransformFloatType];
        if (!type) throw new TypeError('Invalid float type: ' + raw);
        return type;
    }

    public static isCompressed(bits: EncodingBits, scope: NumericScope): boolean {
        if (
            scope === NUMERIC_SCOPES.ARRAY ||
            scope === NUMERIC_SCOPES.STRING ||
            scope === NUMERIC_SCOPES.UNION
        )
            // default true
            return !bits.notCompressedBit || bits.hasCompressionBit;
        if (scope === NUMERIC_SCOPES.ENUM || scope === NUMERIC_SCOPES.INTEGER)
            // default false
            return bits.hasCompressionBit && !bits.notCompressedBit;
        if (scope === NUMERIC_SCOPES.FLOAT)
            // default false
            return bits.hasCompressionBit && !bits.notCompressedBit;

        throw new ReferenceError('Unknown scope kind: ' + scope);
    }

    public static getEncodingBits(options: Consumer): EncodingBits {
        const hasCompression = options.extractIncludes('string', SERIALIZATION_OPTIONS.COMPRESSION);
        const notCompressed = options.extractIncludes('string', SERIALIZATION_OPTIONS.NO_SIZE_COMPRESSION);
        const bigEndian = options.extractIncludes('string', SERIALIZATION_OPTIONS.BIG_ENDIAN);
        const littleEndian = options.extractIncludes('string', SERIALIZATION_OPTIONS.LITTLE_ENDIAN);
        return {
            hasCompressionBit: hasCompression,
            notCompressedBit: notCompressed,
            bigEndianBit: bigEndian,
            littleEndianBit: littleEndian
        };
    }

    public static isLittleEndian(bits: EncodingBits): boolean {
        return !bits.bigEndianBit || bits.littleEndianBit;
    }
}
