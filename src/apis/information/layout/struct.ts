import { LAYOUT_KEYS, SCHEMA_KEYS } from '../../constants';
import type { SchemaDefinition, SchemaField } from '../../../types';
import type { Consumer } from '../../consumer';
import { Context } from '../../context';
import { BindTypeInformation, EncodingInformation } from '../base';
import { OptionalInformation } from './optional';

export interface Field {
    name: string;
    is_constant: boolean;
    type: EncodingInformation;
}

export class StructLayoutInformation extends BindTypeInformation {
    public readonly fields: Field[] = [];
    public override type: string = 'struct';
    public override getEncoding(): EncodingInformation {
        return new StructEncodingInformation(this);
    }
    public override getLayoutData(data: object): void {
        super.getLayoutData(data);
        Reflect.set(
            data,
            'fields',
            this.fields.map((_) => {
                return { name: _.name, is_constant: _.is_constant, type: _.type.createType() };
            })
        );
    }
    public override getTypeKey(): string {
        return super.getTypeKey() + this.fields.map((_) => _.name + _.type.getLayoutKey());
    }
    public override getLayoutKey(): string {
        return super.getLayoutKey() + this.fields.map((_) => _.name + _.type.getLayoutKey());
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {
        const properties = consumer.getProperty<SchemaDefinition>('properties');
        if (!properties.hasValue()) {
            consumer.getProperty<SchemaDefinition>('required').discard();
            return;
        }

        const requires = consumer.getProperty<SchemaDefinition>('required');

        const keys = properties.getKeys();
        for (const key of keys) {
            const name = key.toSpacePascalCase().fixed();
            const consumer = properties.getProperty(key);

            //todo
            consumer.discardMany(['const', 'default']);

            let [encoding, _] = context.childWithEncoding(name, consumer);

            const index = consumer.getProperty<SchemaField>(SCHEMA_KEYS.ORDINAL_INDEX).extract('number');

            if (!requires.hasValue() || !requires.extractIncludes('string', key)) {
                encoding = OptionalInformation.wrap(encoding);
            }

            this.fields[index] = {
                name: name,
                is_constant: consumer.hasProperty('const'),
                type: encoding
            };

            // if (consumer.hasProperty<SchemaField>("const")) {
            //    consumer.getProperty<SchemaField>("const").discard();
            //    this.set("isConstant", true);
            // }

            // consumer.getProperty<SchemaField>("default").discard();

            // const type = context.child(this.name, consumer, "consumeWithEncoding");
            // this.set("child", type);
        }
    }

    // public override getTypeContent(input: object): object {
    //    input = super.getTypeContent(input);
    //    Reflect.set(
    //       input,
    //       "fields",
    //       this.fields.map((_) => _.getTypeContent(Object.create(null))),
    //    );
    //    return input;
    // }
    // public override getFileContent(input: object): object {
    //    input = super.getFileContent(input);
    //    Reflect.set(
    //       input,
    //       "fields",
    //       this.fields.map((_) => _.getTypeContent(Object.create(null))),
    //    );
    //    return input;
    // }
    // public override getIdentityKey(): string {
    //    return (
    //       super.getIdentityKey() +
    //       this.fields.map((_) => _.getIdentityKey()).join("")
    //    );
    // }
    // public override getLayoutKey(): string {
    //    return (
    //       super.getLayoutKey() +
    //       // Yes we want to change hash only by identity not layout
    //       this.fields.map((_) => _.getIdentityKey()).join("")
    //    );
    // }
    // public override process(context: Context, consumer: Consumer): void {
    //    const properties = consumer.getProperty<SchemaDefinition>("properties");
    //    if (!properties.hasValue()) {
    //       consumer.getProperty<SchemaDefinition>("required").discard();
    //       return;
    //    }

    //    const requires = consumer.getProperty<SchemaDefinition>("required");

    //    const keys = properties.getKeys();
    //    for (const key of keys) {
    //       const consumer = properties.getProperty(key);
    //       const c = context.chain(key);
    //       const field = new FieldComponent(key.toSpacePascalCase().fixed());
    //       field.process(c, consumer);

    //       const index = consumer
    //          .getProperty<SchemaField>("x-ordinal-index")
    //          .extract("number");

    //       if (!requires.hasValue() || !requires.extractIncludes("string", key)) {
    //          field.set("child", new OptionalComponent(field.child));
    //       }

    //       this.fields[index] = field;
    //    }
    // }
    // public override getEncoding(): EncodingComponent | null {
    //    return new StructEncodingComponent();
    // }
}

export class StructEncodingInformation extends EncodingInformation {
    public override getEncodingData(data: object): void {
        void data;
    }
    public override getEncodingKey(): string {
        return LAYOUT_KEYS.STRUCT_ENCODING_INFORMATION;
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {
        // todo: maybe somehow includes in metadata
        consumer.discardMany(['pattern', SCHEMA_KEYS.SERIALIZATION_OPTIONS]);
    }
}
