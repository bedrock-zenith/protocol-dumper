import { LAYOUT_KEYS } from '../../constants';
import { EmptyEncodingInformation, EncodingInformation, PrimitiveTypeInformation } from '../base';
import { type DataScope, KeyBuilder } from '../../base';

export class VoidInformation extends PrimitiveTypeInformation {
    public static readonly VOID_LAYOUT_KEY = LAYOUT_KEYS.VOID;
    public constructor() {
        super('void');
    }
    public override getEncoding(): EncodingInformation {
        return new EmptyEncodingInformation(this);
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        void scope;
        builder.append(VoidInformation.VOID_LAYOUT_KEY);
    }
    public override consumeInternal(): void {}
}
