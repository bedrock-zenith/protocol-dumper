import { LAYOUT_KEYS } from '../../constants';
import type { Consumer } from '../../consumer';
import type { Context } from '../../context';
import { EmptyEncodingInformation, EncodingInformation, PrimitiveTypeInformation } from '../base';
import { type DataScope, KeyBuilder } from '../../base';

export class OptionalInformation extends PrimitiveTypeInformation {
    public static wrap(encoding: EncodingInformation): EncodingInformation {
        return new this(encoding).getEncoding();
    }
    public static readonly OPTIONAL_LAYOUT_KEY = LAYOUT_KEYS.OPTIONAL;
    public readonly element: EncodingInformation;
    private constructor(child: EncodingInformation) {
        super('optional');
        this.element = child;
    }
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);
        if (scope === 'layout' || scope === 'field')
            Reflect.set(data, 'element_type', this.element.createData('field'));
    }
    public override getEncoding(): EncodingInformation {
        return new EmptyEncodingInformation(this);
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        builder.append(OptionalInformation.OPTIONAL_LAYOUT_KEY);
        if (scope === 'layout') this.element.getKey(builder, 'layout');

        if (scope === 'field' || scope === 'reference') this.element.getKey(builder, 'field');
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {}
}
