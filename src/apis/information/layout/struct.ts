import { LAYOUT_KEYS, SCHEMA_KEYS } from '../../constants';
import type { SchemaDefinition, SchemaField } from '../../../types';
import type { Consumer } from '../../consumer';
import { Context } from '../../context';
import { BindTypeInformation, EncodingInformation } from '../base';
import { OptionalInformation } from './optional';
import { type DataScope, KeyBuilder } from '../../base';

export interface Field {
    name: string;
    is_constant: boolean;
    type: EncodingInformation;
    metadata?: object;
}

export class StructLayoutInformation extends BindTypeInformation {
    public readonly fields: Field[] = [];
    public override type: string = 'struct';
    public override getEncoding(): EncodingInformation {
        return new StructEncodingInformation(this);
    }
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);
        if (scope === 'layout') {
            Reflect.set(
                data,
                'fields',
                this.fields.map((_) => {
                    return {
                        name: _.name,
                        is_constant: _.is_constant,
                        type: _.type.createData('field'),
                        ...(_.metadata ? { metadata: _.metadata } : {})
                    };
                })
            );
        }
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        super.getKey(builder, scope);
        if (scope === 'layout') {
            for (const field of this.fields) {
                builder.append(field.name);
                field.type.getKey(builder, 'layout');
                builder.append(field.metadata ?? null);
            }
        }
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

            let [encoding, _] = context.childWithEncoding(name, consumer);

            const index = consumer.getProperty<SchemaField>(SCHEMA_KEYS.ORDINAL_INDEX).extract('number');

            const isOptional = !requires.hasValue() || !requires.extractIncludes('string', key);
            if (consumer.hasProperty<SchemaField>('const') && isOptional)
                throw new TypeError(`Constant field '${name}' cannot be optional`);

            if (isOptional) {
                encoding = OptionalInformation.wrap(encoding);
            }

            const obj = (this.fields[index] = {
                name: name,
                is_constant: consumer.hasProperty<SchemaField>('const'),
                type: encoding
            });

            if (consumer.hasProperty<SchemaField>('const') || consumer.hasProperty<SchemaField>('default')) {
                const meta: Record<string, unknown> = {};
                if (consumer.hasProperty<SchemaField>('const'))
                    Reflect.set(
                        meta,
                        'constant_value',
                        consumer.getProperty<SchemaField>('const').extractRaw()
                    );

                if (consumer.hasProperty<SchemaField>('default'))
                    Reflect.set(
                        meta,
                        'default_value',
                        consumer.getProperty<SchemaField>('default').extractRaw()
                    );

                Reflect.set(obj, 'metadata', meta);
            }

            if (name === 'Type') {
                console.log(consumer.getMissingReport());
            }
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
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        super.getKey(builder, scope);
        if (scope === 'layout' || scope === 'field') builder.append(LAYOUT_KEYS.STRUCT_ENCODING_INFORMATION);
    }
    public override consumeInternal(context: Context, consumer: Consumer): void {
        // todo: maybe somehow includes in metadata
        consumer.discardMany([SCHEMA_KEYS.SERIALIZATION_OPTIONS]);

        const pattern = consumer.getProperty<SchemaDefinition>('pattern').extractOptional('string');
        if (pattern) Reflect.set(this.metadata, 'pattern', pattern);
    }
}
