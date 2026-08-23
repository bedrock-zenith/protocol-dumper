import { SCHEMA_KEYS } from '../../constants';
import type { SchemaDefinition } from '../../../types';
import type { Consumer } from '../../consumer';
import { Context } from '../../context';
import { EmptyEncodingInformation, EncodingInformation, PrimitiveTypeInformation } from '../base';
import { StringEncodingInformation, StringInformation } from './string';

export class MapLayoutInformation extends PrimitiveTypeInformation {
    public readonly element!: EncodingInformation;
    public readonly key!: EncodingInformation;
    public constructor() {
        super('map');
    }
    public override getEncoding(): EncodingInformation {
        return new EmptyEncodingInformation(this);
    }
    public override getLayoutKey(): string {
        return '';
    }
    protected override consumeInternal(context: Context, consumer: Consumer): void {
        const additionalProperties = consumer.getProperty<SchemaDefinition>(
            SCHEMA_KEYS.ADDITIONAL_PROPERTIES
        );
        const isImplicit = this.isImplicit(additionalProperties);

        if (isImplicit) {
            const element = context.childWithEncoding('map.element', additionalProperties);
            this.set('element', element[0]);
        } else {
            const element = this.getValueChildWithEncodingExplicit(context, additionalProperties);
            this.set('element', element);
        }

        if (isImplicit) {
            const propertyNames = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.PROPERTY_NAMES);

            let encoding: EncodingInformation;
            if (propertyNames.hasValue()) {
                const data = context.childWithEncoding('map.key', propertyNames);
                encoding = data[0];
            } else encoding = new StringEncodingInformation(new StringInformation());

            this.set('key', encoding);
        } else {
            const encoding = this.getKeyChildWithEncodingExplicit(context, additionalProperties);
            this.set('key', encoding);
        }

        // todo: resolve this edge cases and push it to the encoding information of the value if possible
        additionalProperties.discardMany<SchemaDefinition>(['minimum', 'maximum']);

        // todo: add to metadata
        consumer.discardMany<SchemaDefinition>(['maxProperties']);
    }
    protected isImplicit(additionalProperties: Consumer): boolean {
        const type = additionalProperties.getProperty<SchemaDefinition>('type');
        if (type.hasValue())
            if (type.extract('string') === 'object') {
                const properties = additionalProperties.getProperty<SchemaDefinition>('properties');
                if (properties.hasValue()) {
                    const key = properties.getProperty('key');
                    return key.hasProperty(SCHEMA_KEYS.ORDINAL_INDEX);
                }
                return true;
            }

        return true;
    }
    protected getValueChildWithEncodingExplicit(
        context: Context,
        additionalProperties: Consumer
    ): EncodingInformation {
        const property = additionalProperties.getProperty('properties');
        const child = property.getProperty('value');
        return context.childWithEncoding('map.element', child)[0];
    }
    protected getKeyChildWithEncodingExplicit(
        context: Context,
        additionalProperties: Consumer
    ): EncodingInformation {
        const property = additionalProperties.getProperty('properties');
        const child = property.getProperty('key');
        return context.childWithEncoding('map.key', child)[0];
    }
}
