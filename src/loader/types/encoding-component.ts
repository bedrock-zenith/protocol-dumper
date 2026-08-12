import type { CommonEncoding, IntegerEncoding } from '../../definitions';
import type { Context } from '../context';
import { BaseComponent } from './base-component';

import {
    FLOAT_MAP,
    INTEGER_MAP,
    type AheadOfTransformFloatType,
    type AheadOfTransformIntegerType,
    type Float,
    type Integer
} from '../../definitions';
import type { Consumer } from '../consumer';
import { type SchemaDefinition } from '../../types';
import { IntegerComponent } from './number-component';

export abstract class EncodingComponent extends BaseComponent {
    public readonly base: BaseComponent | null = null;
    public override getTypeContent(input: object): object {
        input = this.base!.getTypeContent(input);
        return input;
    }
    public override getFileContent(input: object): object {
        input = this.base!.getFileContent(input);
        return input;
    }
    public override getIdentityKey(): string {
        return this.base!.getIdentityKey();
    }
    public override getLayoutKey(): string {
        return this.base!.getIdentityKey();
    }
}

export class UnionEncodingComponent extends EncodingComponent {
    public readonly backing: IntegerEncodingComponent | null;
    public readonly backing_hint: Integer;
    public constructor(integer: Integer = 'u32') {
        super();
        this.backing = new IntegerEncodingComponent('union', integer);
        this.backing.set('base', new IntegerComponent(integer));
        this.backing_hint = integer;
    }
    public override process(context: Context, consumer: Consumer): void {
        if (consumer.hasProperty<SchemaDefinition>('x-control-value-type')) {
            const control = consumer.getProperty<SchemaDefinition>('x-control-value-type').extract('string');

            this.set('backing_hint', Utils.integer(control));
            const backing = new IntegerEncodingComponent('union', this.backing_hint);
            backing.set('base', new IntegerComponent(this.backing_hint));
            this.set('backing', backing);
        }
    }

    public override getTypeContent(input: object): object {
        input = super.getTypeContent(input);
        return input;
    }
    public override getFileContent(input: object): object {
        input = super.getFileContent(input);
        return input;
    }
    public override getIdentityKey(): string {
        return super.getIdentityKey() + this.backing!.getIdentityKey();
    }
    public override getLayoutKey(): string {
        return super.getLayoutKey() + this.backing!.getLayoutKey();
    }
}

export class EnumEncodingComponent extends EncodingComponent {
    public readonly backing: IntegerEncodingComponent | null;
    public readonly backing_hint: Integer;
    public readonly pass_by: 'by_value' | 'by_literal';
    public constructor(integer: Integer = 'u32') {
        super();
        this.backing = new IntegerEncodingComponent('enum', integer);
        this.backing_hint = integer;
        this.pass_by = 'by_literal';
    }
    public override process(context: Context, consumer: Consumer): void {
        const options = consumer.getProperty<SchemaDefinition>('x-serialization-options');

        if (options.hasValue()) {
            const enumAsValue = options.extractIncludes('string', 'Enum-as-Value');
            this.set('pass_by', enumAsValue ? 'by_value' : 'by_literal');
            if (enumAsValue) {
                const int = this.backing ?? new IntegerEncodingComponent('enum', this.backing_hint);

                int.set('base', new IntegerComponent(this.backing_hint));

                int.process(context, consumer);
                this.set('backing', int);
            }
        } else {
            // Who tf cares about the number, but mojang surely does, even if they serialize it as string anyway :|
            consumer.getProperty<SchemaDefinition>('x-underlying-type').discard();
            this.set('backing', null);
            this.set('pass_by', 'by_literal');
        }
    }

    public override getTypeContent(input: object): object {
        input = super.getTypeContent(input);
        Reflect.set(input, 'pass_by', this.pass_by);
        if (this.backing) Reflect.set(input, 'backing', this.backing.getTypeContent(Object.create(null)));

        return input;
    }
    public override getFileContent(input: object): object {
        input = super.getFileContent(input);
        Reflect.set(input, 'pass_by', this.pass_by);
        if (this.backing) Reflect.set(input, 'backing', this.backing.getFileContent(Object.create(null)));

        return input;
    }
    public override getIdentityKey(): string {
        return super.getIdentityKey() + (this.backing?.getIdentityKey() ?? '') + this.pass_by;
    }
    public override getLayoutKey(): string {
        return super.getLayoutKey() + (this.backing?.getLayoutKey() ?? '') + this.pass_by;
    }
}

export class FloatEncodingComponent extends EncodingComponent {
    public readonly interpret: Float;
    public readonly numeric_encoding: CommonEncoding;
    public constructor(encoding: CommonEncoding) {
        super();
        this.numeric_encoding = encoding;
        this.interpret = 'f32';
    }
    public override getTypeContent(input: object): object {
        input = super.getTypeContent(input);
        Reflect.set(input, 'interpretation', this.interpret);
        Reflect.set(input, 'encode', this.numeric_encoding);
        return input;
    }
    public override getFileContent(input: object): object {
        input = super.getFileContent(input);
        Reflect.set(input, 'interpretation', this.interpret);
        Reflect.set(input, 'encode', this.numeric_encoding);
        return input;
    }
    public override getIdentityKey(): string {
        return this.numeric_encoding;
    }
    public override getLayoutKey(): string {
        return this.numeric_encoding;
    }
    public override process(context: Context, consumer: Consumer): void {
        const backing = consumer.getProperty<SchemaDefinition>('x-underlying-type');
        if (backing.hasValue()) {
            this.set('interpret', Utils.float(backing.extract('string')));
        }

        const options = consumer.getProperty<SchemaDefinition>('x-serialization-options');
        if (options.hasValue()) {
            const bits = Utils.getEncodingBits(options);
            this.set('numeric_encoding', this.getNumberEncoding(bits));
        }
    }
    public getNumberEncoding(bits: EncodingBits): CommonEncoding {
        // Should never ever happen
        if (Utils.isCompressed(bits, 'float'))
            throw new ReferenceError('Float can not be compressed with leb128 compression');

        return Utils.isLittleEndian(bits) ? 'little_endian' : 'big_endian';
    }
}

export class IntegerEncodingComponent extends EncodingComponent {
    public readonly numeric_encoding: IntegerEncoding;
    public readonly scope: NumericScope;
    public readonly interpret: Integer;
    public constructor(scope: NumericScope, backing: Integer) {
        super();
        this.scope = scope;
        this.interpret = backing;
        this.numeric_encoding = this.getNumberEncoding({
            bigEndianBit: false,
            hasCompressionBit: false,
            littleEndianBit: false,
            notCompressedBit: false
        });
    }
    public getNumberEncoding(bits: EncodingBits): IntegerEncoding {
        if (Utils.isCompressed(bits, this.scope)) {
            return this.interpret.startsWith('i') ? 'zleb128' : 'leb128';
        }

        return Utils.isLittleEndian(bits) ? 'little_endian' : 'big_endian';
    }
    public override getTypeContent(input: object): object {
        input = super.getTypeContent(input);
        Reflect.set(input, 'interpretation', this.interpret);
        Reflect.set(input, 'encoding', this.numeric_encoding);
        return input;
    }
    public override getFileContent(input: object): object {
        input = super.getFileContent(input);
        Reflect.set(input, 'interpretation', this.interpret);
        Reflect.set(input, 'encoding', this.numeric_encoding);
        return input;
    }
    public override getIdentityKey(): string {
        return super.getIdentityKey() + this.interpret + this.numeric_encoding;
    }
    public override getLayoutKey(): string {
        return super.getLayoutKey() + this.interpret + this.numeric_encoding;
    }
    public override process(context: Context, consumer: Consumer): void {
        const backing = consumer.getProperty<SchemaDefinition>('x-underlying-type');
        if (backing.hasValue()) {
            this.set('interpret', Utils.integer(backing.extract('string')));
        }

        const options = consumer.getProperty<SchemaDefinition>('x-serialization-options');

        if (options.hasValue()) {
            // mojangs clusterfuck shi, let us hardcode this non-sense
            // wait, after some investigation looks like some of them are actually available just not properly linked or whatever
            if (
                [
                    'Container Id',
                    'M Stop Expression Version',
                    'Container Type',
                    'Input Data',
                    'Player Permission Level',
                    'Hud Element',
                    'Filter Profanity Change'
                ].includes(context.name)
            ) {
                void options.extractIncludes('string', 'Enum-as-Value');
            }

            const bits = Utils.getEncodingBits(options);
            this.set('numeric_encoding', this.getNumberEncoding(bits));
        }
    }
}

export class StringEncodingComponent extends EncodingComponent {
    public readonly pattern: string | null;
    public constructor() {
        super();
        this.pattern = null;
    }
    public override getTypeContent(input: object): object {
        input = super.getTypeContent(input);
        if (this.pattern) Reflect.set(input, 'pattern', this.pattern);
        return input;
    }
    public override getFileContent(input: object): object {
        input = super.getFileContent(input);
        if (this.pattern) Reflect.set(input, 'pattern', this.pattern);
        return input;
    }
    public override getIdentityKey(): string {
        return super.getIdentityKey() + (this.pattern ?? '');
    }
    public override getLayoutKey(): string {
        return super.getLayoutKey() + (this.pattern ?? '');
    }
    public override process(context: Context, consumer: Consumer): void {
        // Somehow save if possible
        const pattern = consumer.getProperty<SchemaDefinition>('pattern').extractOptional('string');

        this.set('pattern', pattern);
    }
}

export class StructEncodingComponent extends EncodingComponent {
    public readonly pattern: string | null;
    public constructor() {
        super();
        this.pattern = null;
    }
    public override getTypeContent(input: object): object {
        input = super.getTypeContent(input);
        if (this.pattern) Reflect.set(input, 'pattern', this.pattern);
        return input;
    }
    public override getFileContent(input: object): object {
        input = super.getFileContent(input);
        if (this.pattern) Reflect.set(input, 'pattern', this.pattern);
        return input;
    }
    public override getIdentityKey(): string {
        return super.getIdentityKey() + (this.pattern ?? '');
    }
    public override getLayoutKey(): string {
        return super.getLayoutKey() + (this.pattern ?? '');
    }
    public override process(context: Context, consumer: Consumer): void {
        // Somehow save if possible
        const pattern = consumer.getProperty<SchemaDefinition>('pattern').extractOptional('string');

        this.set('pattern', pattern);

        // explanation:
        // \u0077\u0074\u0066\u0020\u0069\u0073\u0020\u0074\u0068\u0061\u0074\u0020\u006d\u006f\u0071\u0069\u0061\u006e\u006b\u003f
        // \u0043\u006f\u006d\u0070\u0072\u0065\u0073\u0073\u0069\u006e\u0067\u0020\u0073\u0074\u0072\u0075\u0063\u0074\u0075\u0072
        // \u0065\u0073\u003f\u0020\u0073\u0075\u0063\u0068\u0020\u0061\u0020\u0073\u0069\u006c\u006c\u0079\u0020\u0067\u0075\u0079
        // \u0020\u006e\u0067\u006c
        if (consumer.hasProperty<SchemaDefinition>('x-serialization-options'))
            consumer
                .getProperty<SchemaDefinition>('x-serialization-options')
                .extractIncludes('string', 'Compression');
    }
}

export class BooleanEncodingComponent extends EncodingComponent {
    public readonly boolean_encoding: 'boolean';
    public constructor() {
        super();
        this.boolean_encoding = 'boolean';
    }
    public override getTypeContent(input: object): object {
        input = super.getTypeContent(input);
        Reflect.set(input, 'encoding', this.boolean_encoding);
        return input;
    }
    public override getFileContent(input: object): object {
        input = super.getFileContent(input);
        Reflect.set(input, 'encoding', this.boolean_encoding);
        return input;
    }
    public override getIdentityKey(): string {
        return super.getIdentityKey() + this.boolean_encoding;
    }
    public override getLayoutKey(): string {
        return super.getLayoutKey() + this.boolean_encoding;
    }
    public override process(context: Context, consumer: Consumer): void {
        const backing = consumer.getProperty<SchemaDefinition>('x-underlying-type').extract('string');

        if (backing !== 'boolean')
            throw new TypeError(
                'Underlying type for boolean should only be boolean, and encoded only in one known way'
            );

        // In some weird unknown cases, MoajqiaankK decide to compress this in theory one bit of information
        // (it's not hatred agains anyone, but i also have right to complain right?)
        // I also learn not to write WTF in every comment when i was working on this project,
        // cus wtf this whole project even is dealing with
        if (consumer.hasProperty<SchemaDefinition>('x-serialization-options'))
            consumer
                .getProperty<SchemaDefinition>('x-serialization-options')
                .extractIncludes('string', 'Compression');

        // So this is later fater the first comment, looks like we got another gift from možjankk
        // and thats passing booleans as enum values or what ever that means
        const options = consumer.getProperty<SchemaDefinition>('x-serialization-options');

        if (options.hasValue()) {
            if (['Filter Profanity Change'].includes(context.name)) {
                void options.extractIncludes('string', 'Enum-as-Value');
            }
        }
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
        if (scope === 'array' || scope === 'string' || scope === 'union')
            // default true
            return !bits.notCompressedBit || bits.hasCompressionBit;
        if (scope === 'enum' || scope === 'integer')
            // default false
            return bits.hasCompressionBit && !bits.notCompressedBit;
        if (scope === 'float')
            // default false
            return bits.hasCompressionBit && !bits.notCompressedBit;

        throw new ReferenceError('Unknown scope kind: ' + scope);
    }

    public static getEncodingBits(options: Consumer): EncodingBits {
        const hasCompression = options.extractIncludes('string', 'Compression');
        const notCompressed = options.extractIncludes('string', 'No size compression');
        const bigEndian = options.extractIncludes('string', 'Big Endian');
        const littleEndian = options.extractIncludes('string', 'Little Endian');
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
