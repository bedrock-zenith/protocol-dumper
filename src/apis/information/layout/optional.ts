import { LAYOUT_KEYS } from '../../constants';
import type { Consumer } from '../../consumer';
import type { Context } from '../../context';
import { EmptyEncodingInformation, EncodingInformation, PrimitiveTypeInformation } from '../base';

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
    public override getLayoutData(data: object): void {
        super.getLayoutData(data);
        Reflect.set(data, 'element_type', this.element.createType());
    }
    public override getEncoding(): EncodingInformation {
        return new EmptyEncodingInformation(this);
    }
    public override getLayoutKey(): string {
        return OptionalInformation.OPTIONAL_LAYOUT_KEY + this.element.getLayoutKey();
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {}
}
