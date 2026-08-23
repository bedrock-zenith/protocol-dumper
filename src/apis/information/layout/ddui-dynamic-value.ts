import { DYNAMIC_VALUE_DESCRIPTION, LAYOUT_KEYS } from '../../constants';
import type { SchemaDefinition } from '../../../types';
import type { Consumer } from '../../consumer';
import type { Context } from '../../context';
import { EmptyEncodingInformation, EncodingInformation, PrimitiveTypeInformation } from '../base';

export class DDUIDynamicInformation extends PrimitiveTypeInformation {
    public static readonly LAYOUT_KEY = LAYOUT_KEYS.DDUI_DYNAMIC;
    public constructor() {
        super('ddui_dynamic');
    }
    public override getEncoding(): EncodingInformation {
        return new EmptyEncodingInformation(this);
    }
    public override getLayoutKey(): string {
        return DDUIDynamicInformation.LAYOUT_KEY;
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {
        const value = consumer.getProperty<SchemaDefinition>('description').extract('string');
        if (value !== DYNAMIC_VALUE_DESCRIPTION)
            throw new TypeError('Unexpected description value: ' + value);
    }
}
