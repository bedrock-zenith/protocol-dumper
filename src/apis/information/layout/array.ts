import { LAYOUT_KEYS } from '../../constants';
import type { SchemaDefinition } from '../../../types';
import type { Consumer } from '../../consumer';
import type { Context } from '../../context';
import { EncodingInformation, PrimitiveTypeInformation } from '../base';
import { IntegerEncodingInformation, IntegerInformation } from './number';

export class ArrayInformation extends PrimitiveTypeInformation {
    public static readonly ARRAY_LAYOUT_KEY = LAYOUT_KEYS.ARRAY;
    public readonly element!: EncodingInformation;
    public constructor() {
        super('array');
    }
    public override getLayoutData(data: object): void {
        super.getLayoutData(data);
        Reflect.set(data, 'element_type', this.element.createType());
    }
    public override getEncoding(): EncodingInformation {
        return new ArrayEncodingInformation(this);
    }
    public override getLayoutKey(): string {
        return ArrayInformation.ARRAY_LAYOUT_KEY + this.element.getLayoutKey();
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {
        //todo: save the encoding as well if possible
        const type = context.childWithEncoding('#item', consumer.getProperty<SchemaDefinition>('items'));

        this.set('element', type[0]);

        // todo: add vector if minItems === maxItems
        consumer.discardMany<SchemaDefinition>(['minItems', 'maxItems', 'maxProperties']);
    }
}

export class ArrayEncodingInformation extends EncodingInformation {
    public readonly length: IntegerEncodingInformation = new IntegerEncodingInformation(
        new IntegerInformation('u32'),
        'array'
    );
    public override getEncodingData(data: object): void {
        Reflect.set(data, 'length_encoding', this.length.createLayout());
    }
    // do not change, its included in the hash
    public override getEncodingKey(): string {
        return this.length.getEncodingKey() + LAYOUT_KEYS.ARRAY;
    }
    protected override consumeInternal(context: Context, consumer: Consumer): void {
        this.length.consume(context, consumer);
    }
}
