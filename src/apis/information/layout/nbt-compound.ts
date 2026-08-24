import { LAYOUT_KEYS } from '../../constants';
import type { Consumer } from '../../consumer';
import type { Context } from '../../context';
import { EmptyEncodingInformation, EncodingInformation, PrimitiveTypeInformation } from '../base';
import { type DataScope, KeyBuilder } from '../../base';

export class NBTCompoundInformation extends PrimitiveTypeInformation {
    public static readonly LAYOUT_KEY = LAYOUT_KEYS.NBT_COMPOUND;
    public constructor() {
        super('nbt_compound');
    }
    public override getEncoding(): EncodingInformation {
        return new EmptyEncodingInformation(this);
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        void scope;
        builder.append(NBTCompoundInformation.LAYOUT_KEY);
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {}
}
