import type { SchemaDefinition } from '../../types';
import type { Consumer } from '../consumer';
import type { Context } from '../context';
import { DataComponent } from './data-component';
import { StringEncodingComponent, type EncodingComponent } from './encoding-component';

export class StringComponent extends DataComponent {
    public constructor() {
        super('string');
    }
    public override process(context: Context, consumer: Consumer): void {
        //todo: include
        consumer.discardMany<SchemaDefinition>(['maxLength', 'minLength', 'pattern']);
    }
    public override getEncoding(): EncodingComponent | null {
        return new StringEncodingComponent();
    }
}
