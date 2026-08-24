import { LAYOUT_KEYS } from '../../constants';
import type { SchemaDefinition } from '../../../types';
import type { Consumer } from '../../consumer';
import type { Context } from '../../context';
import { EncodingInformation, PrimitiveTypeInformation } from '../base';
import { IntegerEncodingInformation, IntegerInformation } from './number';
import { type DataScope, KeyBuilder } from '../../base';

export class ArrayInformation extends PrimitiveTypeInformation {
    public static readonly ARRAY_LAYOUT_KEY = LAYOUT_KEYS.ARRAY;
    public readonly element!: EncodingInformation;
    public readonly vector_length: number | null = null;
    public constructor() {
        super('array');
    }
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);

        if (scope === 'layout' || scope === 'field') {
            if (this.vector_length !== null) Reflect.set(data, 'vector_dimension', this.vector_length);
            Reflect.set(data, 'element_type', this.element.createData('field'));
        }
    }
    public override getEncoding(): EncodingInformation {
        return new ArrayEncodingInformation(this);
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        builder.append(ArrayInformation.ARRAY_LAYOUT_KEY);
        if (scope === 'layout') this.element.getKey(builder, 'layout');

        if (scope === 'field' || scope === 'reference') this.element.getKey(builder, 'field');
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {
        //todo: save the encoding as well if possible
        const type = context.childWithEncoding('#item', consumer.getProperty<SchemaDefinition>('items'));

        this.set('element', type[0]);

        const minItems = consumer.getProperty<SchemaDefinition>('minItems');
        const maxItems = consumer.getProperty<SchemaDefinition>('maxItems');
        const maxProperties = consumer.getProperty<SchemaDefinition>('maxProperties');

        if (
            minItems.hasValue() &&
            maxItems.hasValue() &&
            minItems.extract('number') === maxItems.extract('number')
        ) {
            this.set('vector_length', minItems.extract('number'));
        }

        if (minItems.hasValue()) Reflect.set(this.metadata, 'min_length', minItems.extract('number'));

        if (maxItems.hasValue()) Reflect.set(this.metadata, 'max_length', maxItems.extract('number'));

        if (maxProperties.hasValue())
            Reflect.set(this.metadata, 'max_length', maxProperties.extract('number'));
    }
}

export class ArrayEncodingInformation extends EncodingInformation {
    public readonly length: IntegerEncodingInformation = new IntegerEncodingInformation(
        new IntegerInformation('u32'),
        'array'
    );
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);
        if (scope === 'layout' || scope === 'field')
            Reflect.set(data, 'length_encoding', this.length.createData('field'));
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        super.getKey(builder, scope);
        if (scope === 'layout' || scope === 'field') {
            this.length.getKey(builder, 'field');
            builder.append(LAYOUT_KEYS.ARRAY);
        }
    }
    protected override consumeInternal(context: Context, consumer: Consumer): void {
        this.length.consume(context, consumer);
        this.length.set('metadata', {});
    }
}
